from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import json
import asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        
    async def connect(self, websocket: WebSocket, room_code: str, user_id: str):
        await websocket.accept()
        websocket.user_id = user_id
        if room_code not in self.active_connections:
            self.active_connections[room_code] = []
        self.active_connections[room_code].append(websocket)
        
    def disconnect(self, websocket: WebSocket, room_code: str):
        if room_code in self.active_connections:
            if websocket in self.active_connections[room_code]:
                self.active_connections[room_code].remove(websocket)
                
    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
        
    async def broadcast_to_room(self, message: str, room_code: str):
        if room_code in self.active_connections:
            for connection in self.active_connections[room_code]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    print(f"Error sending message: {e}")

manager = ConnectionManager()

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    user_type: str  # 'host' or 'buyer'
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    user_type: str

class UserLogin(BaseModel):
    email: str
    password: str

class PlayerStats(BaseModel):
    # Batting stats
    batting_average: float = 0.0
    strike_rate: float = 0.0
    centuries: int = 0
    fifties: int = 0
    
    # Bowling stats
    wickets_taken: int = 0
    economy_rate: float = 0.0
    best_bowling_figures: str = "0/0"
    
    # Fielding stats
    catches: int = 0
    run_outs: int = 0
    
    # Overall stats
    matches_played: int = 0
    recent_form_rating: float = 5.0  # 1-10 scale
    experience_years: int = 0

class Player(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    profile_picture: Optional[str] = None
    player_type: str  # 'batsman', 'bowler', 'all-rounder', 'wicket-keeper'
    stats: PlayerStats
    performance_score: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PlayerCreate(BaseModel):
    name: str
    profile_picture: Optional[str] = None
    player_type: str
    stats: PlayerStats

class BuyerProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    budget: float
    preferred_players: List[str] = []  # player types or specific players
    recommended_players: List[str] = []  # AI generated recommendations
    current_team: List[str] = []  # player IDs
    remaining_budget: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BuyerProfileCreate(BaseModel):
    budget: float
    preferred_players: List[str] = []

class AuctionRoom(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_code: str = Field(default_factory=lambda: str(uuid.uuid4())[:8].upper())
    host_id: str
    room_name: str
    players: List[str] = []  # player IDs
    buyers: List[str] = []  # buyer user IDs
    current_player_index: int = 0
    current_highest_bid: float = 0.0
    current_highest_bidder: Optional[str] = None
    auction_status: str = "waiting"  # waiting, active, completed
    auction_start_time: Optional[datetime] = None
    bid_timer: int = 5  # seconds
    results: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AuctionRoomCreate(BaseModel):
    room_name: str

class Bid(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_id: str
    player_id: str
    bidder_id: str
    amount: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BidCreate(BaseModel):
    room_id: str
    player_id: str
    amount: float

# Performance scoring function
def calculate_performance_score(stats: PlayerStats, player_type: str) -> float:
    score = 0.0
    
    if player_type in ['batsman', 'all-rounder', 'wicket-keeper']:
        # Batting score (40% weight, prioritize strike rate)
        batting_score = 0
        if stats.strike_rate > 0:
            batting_score += min(stats.strike_rate / 150 * 4, 4)  # Strike rate priority
        if stats.batting_average > 0:
            batting_score += min(stats.batting_average / 50 * 2, 2)
        batting_score += stats.centuries * 0.5 + stats.fifties * 0.3
        score += min(batting_score, 4) * 0.4
        
    if player_type in ['bowler', 'all-rounder']:
        # Bowling score (35% weight, prioritize economy rate)
        bowling_score = 0
        if stats.economy_rate > 0:
            bowling_score += max(0, (8 - stats.economy_rate) / 8 * 4)  # Economy rate priority (lower is better)
        if stats.wickets_taken > 0:
            bowling_score += min(stats.wickets_taken / 100 * 2, 2)
        score += min(bowling_score, 3.5) * 0.35
        
    # Fielding score (15% weight)
    fielding_score = (stats.catches * 0.1 + stats.run_outs * 0.2)
    score += min(fielding_score, 1.5) * 0.15
    
    # Overall performance (10% weight)
    overall_score = (stats.recent_form_rating / 10 * 0.5 + 
                    min(stats.experience_years / 15, 1) * 0.5)
    score += overall_score * 0.1
    
    return min(score * 10, 10.0)  # Scale to 1-10

# AI Recommendation system
async def get_player_recommendations(buyer_profile: BuyerProfile, available_players: List[Player]) -> List[str]:
    try:
        # Get LLM key from environment
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        if not llm_key:
            return []
            
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"recommendations_{buyer_profile.id}",
            system_message="You are a cricket auction expert. Analyze player stats and buyer preferences to recommend the best players within budget."
        ).with_model("openai", "gpt-4o-mini")
        
        # Prepare player data for AI
        player_data = []
        for player in available_players:
            player_data.append({
                "id": player.id,
                "name": player.name,
                "type": player.player_type,
                "performance_score": player.performance_score,
                "stats": player.stats.dict()
            })
        
        message = f"""
        Buyer Budget: ${buyer_profile.budget}
        Preferred Player Types: {buyer_profile.preferred_players}
        Available Players: {json.dumps(player_data, default=str)}
        
        Based on the buyer's budget and preferences, recommend the top 5 players they should prioritize bidding on.
        Focus on performance scores, player types matching preferences, and value for money.
        Return only a JSON array of player IDs in priority order.
        """
        
        user_message = UserMessage(text=message)
        response = await chat.send_message(user_message)
        
        # Parse AI response
        import re
        json_match = re.search(r'\[.*\]', response)
        if json_match:
            recommended_ids = json.loads(json_match.group())
            return recommended_ids[:5]
        
    except Exception as e:
        print(f"AI recommendation error: {e}")
    
    # Fallback to rule-based recommendations
    filtered_players = [p for p in available_players if not buyer_profile.preferred_players or p.player_type in buyer_profile.preferred_players]
    sorted_players = sorted(filtered_players, key=lambda x: x.performance_score, reverse=True)
    return [p.id for p in sorted_players[:5]]

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Auction Pro API - Live Cricket Auction Platform"}

# Auth endpoints
@api_router.post("/auth/register", response_model=User)
async def register_user(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user = User(
        username=user_data.username,
        email=user_data.email,
        user_type=user_data.user_type
    )
    
    await db.users.insert_one(user.dict())
    return user

@api_router.post("/auth/login", response_model=User)
async def login_user(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    return User(**user)

# Player endpoints
@api_router.post("/players", response_model=Player)
async def create_player(player_data: PlayerCreate, host_id: str):
    # Verify host exists
    host = await db.users.find_one({"id": host_id, "user_type": "host"})
    if not host:
        raise HTTPException(status_code=403, detail="Only hosts can create players")
    
    player = Player(**player_data.dict())
    player.performance_score = calculate_performance_score(player.stats, player.player_type)
    
    await db.players.insert_one(player.dict())
    return player

@api_router.get("/players", response_model=List[Player])
async def get_players():
    players = await db.players.find().to_list(length=None)
    return [Player(**player) for player in players]

@api_router.get("/players/{player_id}", response_model=Player)
async def get_player(player_id: str):
    player = await db.players.find_one({"id": player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return Player(**player)

# Buyer profile endpoints
@api_router.post("/buyer-profile", response_model=BuyerProfile)
async def create_buyer_profile(profile_data: BuyerProfileCreate, user_id: str):
    # Check if profile already exists
    existing_profile = await db.buyer_profiles.find_one({"user_id": user_id})
    if existing_profile:
        # Update existing profile
        await db.buyer_profiles.update_one(
            {"user_id": user_id},
            {"$set": {
                "budget": profile_data.budget,
                "preferred_players": profile_data.preferred_players,
                "remaining_budget": profile_data.budget
            }}
        )
        updated_profile = await db.buyer_profiles.find_one({"user_id": user_id})
        return BuyerProfile(**updated_profile)
    
    profile = BuyerProfile(
        user_id=user_id,
        budget=profile_data.budget,
        preferred_players=profile_data.preferred_players,
        remaining_budget=profile_data.budget
    )
    
    await db.buyer_profiles.insert_one(profile.dict())
    return profile

@api_router.get("/buyer-profile/{user_id}", response_model=BuyerProfile)
async def get_buyer_profile(user_id: str):
    profile = await db.buyer_profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return BuyerProfile(**profile)

@api_router.get("/buyer-profile/{user_id}/recommendations")
async def get_recommendations(user_id: str):
    profile = await db.buyer_profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    buyer_profile = BuyerProfile(**profile)
    players = await db.players.find().to_list(length=None)
    available_players = [Player(**player) for player in players]
    
    recommendations = await get_player_recommendations(buyer_profile, available_players)
    
    # Update profile with recommendations
    await db.buyer_profiles.update_one(
        {"user_id": user_id},
        {"$set": {"recommended_players": recommendations}}
    )
    
    return {"recommended_players": recommendations}

# Auction room endpoints
@api_router.post("/auction-rooms", response_model=AuctionRoom)
async def create_auction_room(room_data: AuctionRoomCreate, host_id: str):
    host = await db.users.find_one({"id": host_id, "user_type": "host"})
    if not host:
        raise HTTPException(status_code=403, detail="Only hosts can create auction rooms")
    
    room = AuctionRoom(
        host_id=host_id,
        room_name=room_data.room_name
    )
    
    await db.auction_rooms.insert_one(room.dict())
    return room

@api_router.get("/auction-rooms/{room_code}", response_model=AuctionRoom)
async def get_auction_room(room_code: str):
    room = await db.auction_rooms.find_one({"room_code": room_code})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return AuctionRoom(**room)

@api_router.post("/auction-rooms/{room_code}/add-player")
async def add_player_to_room(room_code: str, player_id: str, host_id: str):
    room = await db.auction_rooms.find_one({"room_code": room_code, "host_id": host_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found or unauthorized")
    
    await db.auction_rooms.update_one(
        {"room_code": room_code},
        {"$addToSet": {"players": player_id}}
    )
    return {"success": True}

@api_router.post("/auction-rooms/{room_code}/join")
async def join_auction_room(room_code: str, user_id: str):
    room = await db.auction_rooms.find_one({"room_code": room_code})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    await db.auction_rooms.update_one(
        {"room_code": room_code},
        {"$addToSet": {"buyers": user_id}}
    )
    return {"success": True}

@api_router.post("/auction-rooms/{room_code}/start")
async def start_auction(room_code: str, host_id: str):
    room = await db.auction_rooms.find_one({"room_code": room_code, "host_id": host_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found or unauthorized")
    
    await db.auction_rooms.update_one(
        {"room_code": room_code},
        {"$set": {
            "auction_status": "active",
            "auction_start_time": datetime.now(timezone.utc),
            "current_player_index": 0,
            "current_highest_bid": 0.0,
            "current_highest_bidder": None
        }}
    )
    
    # Broadcast to all connected clients
    await manager.broadcast_to_room(
        json.dumps({"type": "auction_started", "room_code": room_code}),
        room_code
    )
    
    return {"success": True, "message": "Auction started"}

# Bidding endpoints
@api_router.post("/bids")
async def place_bid(bid_data: BidCreate, bidder_id: str):
    # Verify room and auction status
    room = await db.auction_rooms.find_one({"id": bid_data.room_id, "auction_status": "active"})
    if not room:
        raise HTTPException(status_code=400, detail="Auction not active")
    
    # Check if bid is higher than current highest
    if bid_data.amount <= room.get("current_highest_bid", 0):
        raise HTTPException(status_code=400, detail="Bid must be higher than current highest bid")
    
    # Check buyer's budget
    profile = await db.buyer_profiles.find_one({"user_id": bidder_id})
    if not profile or profile.get("remaining_budget", 0) < bid_data.amount:
        raise HTTPException(status_code=400, detail="Insufficient budget")
    
    # Create bid
    bid = Bid(
        room_id=bid_data.room_id,
        player_id=bid_data.player_id,
        bidder_id=bidder_id,
        amount=bid_data.amount
    )
    
    await db.bids.insert_one(bid.dict())
    
    # Update room with new highest bid
    await db.auction_rooms.update_one(
        {"id": bid_data.room_id},
        {"$set": {
            "current_highest_bid": bid_data.amount,
            "current_highest_bidder": bidder_id
        }}
    )
    
    # Broadcast bid to all room participants
    room_code = room.get("room_code")
    await manager.broadcast_to_room(
        json.dumps({
            "type": "new_bid",
            "player_id": bid_data.player_id,
            "amount": bid_data.amount,
            "bidder_id": bidder_id
        }),
        room_code
    )
    
    return {"success": True}

# WebSocket endpoint
@app.websocket("/ws/{room_code}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_code: str, user_id: str):
    await manager.connect(websocket, room_code, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "bid_timer_end":
                # Handle bid timer completion
                room = await db.auction_rooms.find_one({"room_code": room_code})
                if room and room.get("auction_status") == "active":
                    current_player_index = room.get("current_player_index", 0)
                    players = room.get("players", [])
                    
                    if current_player_index < len(players):
                        # Award player to highest bidder
                        highest_bidder = room.get("current_highest_bidder")
                        highest_bid = room.get("current_highest_bid", 0)
                        current_player = players[current_player_index]
                        
                        if highest_bidder and highest_bid > 0:
                            # Update buyer profile
                            await db.buyer_profiles.update_one(
                                {"user_id": highest_bidder},
                                {
                                    "$push": {"current_team": current_player},
                                    "$inc": {"remaining_budget": -highest_bid}
                                }
                            )
                        
                        # Move to next player
                        next_index = current_player_index + 1
                        if next_index >= len(players):
                            # Auction complete
                            await db.auction_rooms.update_one(
                                {"room_code": room_code},
                                {"$set": {"auction_status": "completed"}}
                            )
                            await manager.broadcast_to_room(
                                json.dumps({"type": "auction_completed"}),
                                room_code
                            )
                        else:
                            # Next player
                            await db.auction_rooms.update_one(
                                {"room_code": room_code},
                                {"$set": {
                                    "current_player_index": next_index,
                                    "current_highest_bid": 0.0,
                                    "current_highest_bidder": None
                                }}
                            )
                            await manager.broadcast_to_room(
                                json.dumps({
                                    "type": "next_player",
                                    "player_index": next_index,
                                    "player_id": players[next_index] if next_index < len(players) else None
                                }),
                                room_code
                            )
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_code)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()