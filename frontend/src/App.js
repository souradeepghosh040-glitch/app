import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const App = () => {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('login');
  const [auctionRoom, setAuctionRoom] = useState(null);
  const [socket, setSocket] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [bidTimer, setBidTimer] = useState(5);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerRef = useRef(null);

  // Login Component
  const LoginRegister = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
      username: '',
      email: '',
      password: '',
      userType: 'buyer'
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const endpoint = isLogin ? '/auth/login' : '/auth/register';
        const payload = isLogin 
          ? { email: formData.email, password: formData.password }
          : { username: formData.username, email: formData.email, password: formData.password, user_type: formData.userType };
        
        const response = await axios.post(`${API}${endpoint}`, payload);
        setUser(response.data);
        
        if (response.data.user_type === 'host') {
          setCurrentView('host-dashboard');
        } else {
          setCurrentView('buyer-dashboard');
        }
      } catch (error) {
        alert('Authentication failed: ' + (error.response?.data?.detail || error.message));
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 w-full max-w-md border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">🏏 Auction Pro</h1>
            <p className="text-blue-200">Live Cricket Auction Platform</p>
          </div>
          
          <div className="flex mb-6 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                isLogin ? 'bg-blue-600 text-white' : 'text-blue-200 hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                !isLogin ? 'bg-blue-600 text-white' : 'text-blue-200 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <input
                type="text"
                placeholder="Username"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            )}
            
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            
            {!isLogin && (
              <select
                value={formData.userType}
                onChange={(e) => setFormData({...formData, userType: e.target.value})}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="buyer" className="bg-gray-800">Buyer</option>
                <option value="host" className="bg-gray-800">Host</option>
              </select>
            )}
            
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold"
            >
              {isLogin ? 'Login' : 'Register'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  // Player Creation Component
  const PlayerCreation = ({ onBack, onPlayerCreated }) => {
    const [playerData, setPlayerData] = useState({
      name: '',
      player_type: 'batsman',
      profile_picture: '',
      stats: {
        batting_average: 0,
        strike_rate: 0,
        centuries: 0,
        fifties: 0,
        wickets_taken: 0,
        economy_rate: 0,
        best_bowling_figures: '0/0',
        catches: 0,
        run_outs: 0,
        matches_played: 0,
        recent_form_rating: 5,
        experience_years: 0
      }
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const response = await axios.post(
          `${API}/players?host_id=${user.id}`,
          playerData
        );
        onPlayerCreated(response.data);
        setPlayerData({
          name: '',
          player_type: 'batsman',
          profile_picture: '',
          stats: {
            batting_average: 0,
            strike_rate: 0,
            centuries: 0,
            fifties: 0,
            wickets_taken: 0,
            economy_rate: 0,
            best_bowling_figures: '0/0',
            catches: 0,
            run_outs: 0,
            matches_played: 0,
            recent_form_rating: 5,
            experience_years: 0
          }
        });
      } catch (error) {
        alert('Failed to create player: ' + (error.response?.data?.detail || error.message));
      }
    };

    const handleStatChange = (statName, value) => {
      setPlayerData(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          [statName]: parseFloat(value) || 0
        }
      }));
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-purple-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white">Create Player</h2>
              <button
                onClick={onBack}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-all"
              >
                Back
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-blue-200 mb-2">Player Name</label>
                  <input
                    type="text"
                    value={playerData.name}
                    onChange={(e) => setPlayerData({...playerData, name: e.target.value})}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-blue-200 mb-2">Player Type</label>
                  <select
                    value={playerData.player_type}
                    onChange={(e) => setPlayerData({...playerData, player_type: e.target.value})}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="batsman" className="bg-gray-800">Batsman</option>
                    <option value="bowler" className="bg-gray-800">Bowler</option>
                    <option value="all-rounder" className="bg-gray-800">All-rounder</option>
                    <option value="wicket-keeper" className="bg-gray-800">Wicket-keeper</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-blue-200 mb-2">Profile Picture URL (Optional)</label>
                <input
                  type="url"
                  value={playerData.profile_picture}
                  onChange={(e) => setPlayerData({...playerData, profile_picture: e.target.value})}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Batting Stats</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-blue-200 mb-1">Batting Average</label>
                      <input
                        type="number"
                        step="0.01"
                        value={playerData.stats.batting_average}
                        onChange={(e) => handleStatChange('batting_average', e.target.value)}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-blue-200 mb-1">Strike Rate</label>
                      <input
                        type="number"
                        step="0.01"
                        value={playerData.stats.strike_rate}
                        onChange={(e) => handleStatChange('strike_rate', e.target.value)}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-blue-200 mb-1">Centuries</label>
                      <input
                        type="number"
                        value={playerData.stats.centuries}
                        onChange={(e) => handleStatChange('centuries', e.target.value)}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-blue-200 mb-1">Fifties</label>
                      <input
                        type="number"
                        value={playerData.stats.fifties}
                        onChange={(e) => handleStatChange('fifties', e.target.value)}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Bowling Stats</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-blue-200 mb-1">Wickets Taken</label>
                      <input
                        type="number"
                        value={playerData.stats.wickets_taken}
                        onChange={(e) => handleStatChange('wickets_taken', e.target.value)}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-blue-200 mb-1">Economy Rate</label>
                      <input
                        type="number"
                        step="0.01"
                        value={playerData.stats.economy_rate}
                        onChange={(e) => handleStatChange('economy_rate', e.target.value)}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-blue-200 mb-1">Best Figures</label>
                      <input
                        type="text"
                        value={playerData.stats.best_bowling_figures}
                        onChange={(e) => setPlayerData(prev => ({
                          ...prev,
                          stats: {...prev.stats, best_bowling_figures: e.target.value}
                        }))}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Overall Stats</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-blue-200 mb-1">Catches</label>
                      <input
                        type="number"
                        value={playerData.stats.catches}
                        onChange={(e) => handleStatChange('catches', e.target.value)}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-blue-200 mb-1">Run Outs</label>
                      <input
                        type="number"
                        value={playerData.stats.run_outs}
                        onChange={(e) => handleStatChange('run_outs', e.target.value)}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-blue-200 mb-1">Matches Played</label>
                      <input
                        type="number"
                        value={playerData.stats.matches_played}
                        onChange={(e) => handleStatChange('matches_played', e.target.value)}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-blue-200 mb-1">Recent Form (1-10)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={playerData.stats.recent_form_rating}
                        onChange={(e) => handleStatChange('recent_form_rating', e.target.value)}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-blue-200 mb-1">Experience (Years)</label>
                      <input
                        type="number"
                        value={playerData.stats.experience_years}
                        onChange={(e) => handleStatChange('experience_years', e.target.value)}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 px-6 rounded-lg hover:from-green-700 hover:to-blue-700 transition-all font-semibold"
              >
                Create Player
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // Host Dashboard
  const HostDashboard = () => {
    const [players, setPlayers] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [showCreatePlayer, setShowCreatePlayer] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');

    useEffect(() => {
      loadPlayers();
    }, []);

    const loadPlayers = async () => {
      try {
        const response = await axios.get(`${API}/players`);
        setPlayers(response.data);
      } catch (error) {
        console.error('Failed to load players:', error);
      }
    };

    const createRoom = async (e) => {
      e.preventDefault();
      try {
        const response = await axios.post(
          `${API}/auction-rooms?host_id=${user.id}`,
          { room_name: newRoomName }
        );
        setRooms([...rooms, response.data]);
        setNewRoomName('');
        alert(`Room created! Code: ${response.data.room_code}`);
      } catch (error) {
        alert('Failed to create room: ' + (error.response?.data?.detail || error.message));
      }
    };

    if (showCreatePlayer) {
      return (
        <PlayerCreation
          onBack={() => setShowCreatePlayer(false)}
          onPlayerCreated={(player) => {
            setPlayers([...players, player]);
            setShowCreatePlayer(false);
            alert(`Player created with performance score: ${player.performance_score.toFixed(1)}/10`);
          }}
        />
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white">Host Dashboard</h2>
                <p className="text-blue-200">Welcome back, {user.username}!</p>
              </div>
              <button
                onClick={() => setUser(null)}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-all"
              >
                Logout
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-semibold text-white">Players ({players.length})</h3>
                  <button
                    onClick={() => setShowCreatePlayer(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all"
                  >
                    Add Player
                  </button>
                </div>
                
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {players.map(player => (
                    <div key={player.id} className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-semibold">{player.name}</h4>
                          <p className="text-blue-200 text-sm capitalize">{player.player_type}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-yellow-400 font-bold text-lg">
                            {player.performance_score.toFixed(1)}/10
                          </div>
                          <p className="text-blue-200 text-xs">Performance Score</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-semibold text-white mb-6">Create Auction Room</h3>
                
                <form onSubmit={createRoom} className="mb-6">
                  <input
                    type="text"
                    placeholder="Room Name"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold"
                  >
                    Create Room
                  </button>
                </form>

                <div className="space-y-4">
                  {rooms.map(room => (
                    <div key={room.id} className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <h4 className="text-white font-semibold">{room.room_name}</h4>
                      <p className="text-blue-200">Code: <span className="font-mono bg-white/10 px-2 py-1 rounded">{room.room_code}</span></p>
                      <p className="text-sm text-gray-300">Status: {room.auction_status}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Buyer Dashboard
  const BuyerDashboard = () => {
    const [profile, setProfile] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [roomCode, setRoomCode] = useState('');
    const [budget, setBudget] = useState('');
    const [preferences, setPreferences] = useState([]);

    useEffect(() => {
      loadBuyerProfile();
    }, []);

    const loadBuyerProfile = async () => {
      try {
        const response = await axios.get(`${API}/buyer-profile/${user.id}`);
        setProfile(response.data);
        loadRecommendations();
      } catch (error) {
        console.log('No profile found, user needs to create one');
      }
    };

    const loadRecommendations = async () => {
      try {
        const response = await axios.get(`${API}/buyer-profile/${user.id}/recommendations`);
        setRecommendations(response.data.recommended_players || []);
      } catch (error) {
        console.error('Failed to load recommendations:', error);
      }
    };

    const createProfile = async (e) => {
      e.preventDefault();
      try {
        const response = await axios.post(
          `${API}/buyer-profile?user_id=${user.id}`,
          {
            budget: parseFloat(budget),
            preferred_players: preferences
          }
        );
        setProfile(response.data);
        loadRecommendations();
      } catch (error) {
        alert('Failed to create profile: ' + (error.response?.data?.detail || error.message));
      }
    };

    const joinRoom = async (e) => {
      e.preventDefault();
      try {
        await axios.post(`${API}/auction-rooms/${roomCode}/join?user_id=${user.id}`);
        const roomResponse = await axios.get(`${API}/auction-rooms/${roomCode}`);
        setAuctionRoom(roomResponse.data);
        setCurrentView('auction');
        
        // Connect to WebSocket
        const wsUrl = `wss://sportsbid.preview.emergentagent.com/ws/${roomCode}/${user.id}`;
        const ws = new WebSocket(wsUrl);
        setSocket(ws);
      } catch (error) {
        alert('Failed to join room: ' + (error.response?.data?.detail || error.message));
      }
    };

    const handlePreferenceChange = (type, checked) => {
      if (checked) {
        setPreferences([...preferences, type]);
      } else {
        setPreferences(preferences.filter(p => p !== type));
      }
    };

    if (!profile) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-white">Setup Your Profile</h2>
                <button
                  onClick={() => setUser(null)}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-all"
                >
                  Logout
                </button>
              </div>

              <form onSubmit={createProfile} className="space-y-6">
                <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">💰</span>
                    <div>
                      <h3 className="text-green-400 font-semibold text-lg">Your Auction Budget</h3>
                      <p className="text-green-200">₹120 Crores (Fixed for all buyers)</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-blue-200 mb-4">Select Your Preferred Player Types</label>
                  <div className="grid grid-cols-2 gap-4">
                    {['batsman', 'bowler', 'all-rounder', 'wicket-keeper'].map(type => (
                      <label key={type} className="flex items-center space-x-3 text-white">
                        <input
                          type="checkbox"
                          checked={preferences.includes(type)}
                          onChange={(e) => handlePreferenceChange(type, e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="capitalize">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold"
                >
                  Create Profile
                </button>
              </form>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white">Buyer Dashboard</h2>
                <p className="text-blue-200">Welcome back, {user.username}!</p>
              </div>
              <button
                onClick={() => setUser(null)}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-all"
              >
                Logout
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-semibold text-white mb-6">Your Profile</h3>
                <div className="bg-white/5 p-6 rounded-lg border border-white/10 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-blue-200">Budget:</span>
                    <span className="text-green-400 font-semibold">${profile.budget}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-200">Remaining:</span>
                    <span className="text-green-400 font-semibold">${profile.remaining_budget}</span>
                  </div>
                  <div>
                    <span className="text-blue-200">Preferences:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {profile.preferred_players.map(pref => (
                        <span key={pref} className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm capitalize">
                          {pref}
                        </span>
                      ))}
                    </div>
                  </div>
                  {profile.current_team.length > 0 && (
                    <div>
                      <span className="text-blue-200">Your Team ({profile.current_team.length}):</span>
                      <div className="mt-2 space-y-1">
                        {profile.current_team.map((playerId, index) => (
                          <div key={index} className="text-white text-sm bg-white/5 p-2 rounded">
                            Player ID: {playerId}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {recommendations.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-xl font-semibold text-white mb-4">🤖 AI Recommendations</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {recommendations.map((playerId, index) => (
                        <div key={playerId} className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 p-3 rounded-lg border border-purple-500/30">
                          <div className="flex items-center justify-between">
                            <span className="text-white">#{index + 1} Priority</span>
                            <span className="text-purple-300 text-sm">Player ID: {playerId}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-2xl font-semibold text-white mb-6">Join Auction</h3>
                <form onSubmit={joinRoom} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Enter Room Code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 px-6 rounded-lg hover:from-green-700 hover:to-blue-700 transition-all font-semibold"
                  >
                    Join Auction
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Auction Room Component
  const AuctionRoom = () => {
    const [players, setPlayers] = useState([]);
    const [bids, setBids] = useState([]);
    const [bidAmount, setBidAmount] = useState('');
    const [buyerProfile, setBuyerProfile] = useState(null);

    useEffect(() => {
      loadAuctionData();
      setupWebSocket();
      return () => {
        if (socket) {
          socket.close();
        }
      };
    }, []);

    const loadAuctionData = async () => {
      try {
        // Load buyer profile
        const profileResponse = await axios.get(`${API}/buyer-profile/${user.id}`);
        setBuyerProfile(profileResponse.data);

        // Load players for this auction
        if (auctionRoom.players.length > 0) {
          const playerPromises = auctionRoom.players.map(playerId =>
            axios.get(`${API}/players/${playerId}`)
          );
          const playerResponses = await Promise.all(playerPromises);
          setPlayers(playerResponses.map(res => res.data));
        }
      } catch (error) {
        console.error('Failed to load auction data:', error);
      }
    };

    const setupWebSocket = () => {
      if (socket) {
        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          if (data.type === 'auction_started') {
            setIsTimerActive(true);
            startBidTimer();
          } else if (data.type === 'new_bid') {
            setBids(prev => [...prev, data]);
            // Update room state
            setAuctionRoom(prev => ({
              ...prev,
              current_highest_bid: data.amount,
              current_highest_bidder: data.bidder_id
            }));
          } else if (data.type === 'next_player') {
            setAuctionRoom(prev => ({
              ...prev,
              current_player_index: data.player_index,
              current_highest_bid: 0,
              current_highest_bidder: null
            }));
            setBidTimer(5);
            setIsTimerActive(true);
            startBidTimer();
          } else if (data.type === 'auction_completed') {
            setIsTimerActive(false);
            alert('Auction completed!');
          }
        };
      }
    };

    const startBidTimer = () => {
      setBidTimer(5);
      timerRef.current = setInterval(() => {
        setBidTimer(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsTimerActive(false);
            // Send timer end message
            if (socket) {
              socket.send(JSON.stringify({ type: 'bid_timer_end' }));
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const placeBid = async (e) => {
      e.preventDefault();
      if (!bidAmount || parseFloat(bidAmount) <= auctionRoom.current_highest_bid) {
        alert('Bid must be higher than current highest bid');
        return;
      }

      try {
        await axios.post(`${API}/bids?bidder_id=${user.id}`, {
          room_id: auctionRoom.id,
          player_id: players[auctionRoom.current_player_index]?.id,
          amount: parseFloat(bidAmount)
        });
        setBidAmount('');
      } catch (error) {
        alert('Failed to place bid: ' + (error.response?.data?.detail || error.message));
      }
    };

    const currentPlayer = players[auctionRoom?.current_player_index] || null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-orange-900 to-yellow-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white">🏏 Live Auction</h2>
                <p className="text-orange-200">Room: {auctionRoom.room_name} ({auctionRoom.room_code})</p>
              </div>
              <div className="text-right">
                <div className="text-green-400 font-bold text-xl">
                  ${buyerProfile?.remaining_budget || 0}
                </div>
                <p className="text-orange-200 text-sm">Remaining Budget</p>
              </div>
            </div>

            {auctionRoom.auction_status === 'waiting' && (
              <div className="text-center py-12">
                <h3 className="text-2xl font-semibold text-white mb-4">Waiting for Auction to Start</h3>
                <p className="text-orange-200">All buyers must be present before the host can start the auction.</p>
              </div>
            )}

            {auctionRoom.auction_status === 'active' && currentPlayer && (
              <div className="space-y-8">
                <div className="text-center">
                  <div className={`text-6xl font-bold ${isTimerActive ? 'text-red-400' : 'text-gray-400'} mb-4`}>
                    {bidTimer}
                  </div>
                  <p className="text-orange-200">seconds remaining</p>
                </div>

                <div className="bg-white/10 p-6 rounded-xl border border-white/20">
                  <div className="text-center mb-6">
                    <h3 className="text-3xl font-bold text-white mb-2">{currentPlayer.name}</h3>
                    <p className="text-orange-200 text-lg capitalize">{currentPlayer.player_type}</p>
                    <div className="text-yellow-400 font-bold text-2xl mt-2">
                      Performance Score: {currentPlayer.performance_score.toFixed(1)}/10
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <h4 className="text-white font-semibold mb-2">Batting</h4>
                      <div className="text-sm text-orange-200 space-y-1">
                        <p>Average: {currentPlayer.stats.batting_average}</p>
                        <p>Strike Rate: {currentPlayer.stats.strike_rate}</p>
                        <p>Centuries: {currentPlayer.stats.centuries}</p>
                        <p>Fifties: {currentPlayer.stats.fifties}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-2">Bowling</h4>
                      <div className="text-sm text-orange-200 space-y-1">
                        <p>Wickets: {currentPlayer.stats.wickets_taken}</p>
                        <p>Economy: {currentPlayer.stats.economy_rate}</p>
                        <p>Best: {currentPlayer.stats.best_bowling_figures}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-2">Overall</h4>
                      <div className="text-sm text-orange-200 space-y-1">
                        <p>Matches: {currentPlayer.stats.matches_played}</p>
                        <p>Experience: {currentPlayer.stats.experience_years} years</p>
                        <p>Recent Form: {currentPlayer.stats.recent_form_rating}/10</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center mb-6">
                    <div className="text-2xl font-bold text-green-400">
                      Current Highest Bid: ${auctionRoom.current_highest_bid || 0}
                    </div>
                    {auctionRoom.current_highest_bidder && (
                      <p className="text-orange-200">by Bidder: {auctionRoom.current_highest_bidder}</p>
                    )}
                  </div>

                  <form onSubmit={placeBid} className="flex gap-4 max-w-md mx-auto">
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder="Enter bid amount"
                      className="flex-1 p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      min={auctionRoom.current_highest_bid + 1}
                    />
                    <button
                      type="submit"
                      disabled={!isTimerActive}
                      className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-blue-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Bid
                    </button>
                  </form>
                </div>
              </div>
            )}

            {auctionRoom.auction_status === 'completed' && (
              <div className="text-center py-12">
                <h3 className="text-3xl font-bold text-white mb-4">🎉 Auction Completed!</h3>
                <p className="text-orange-200 mb-6">Thank you for participating in the auction.</p>
                <button
                  onClick={() => setCurrentView('buyer-dashboard')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold"
                >
                  Back to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Main render logic
  if (!user) {
    return <LoginRegister />;
  }

  switch (currentView) {
    case 'host-dashboard':
      return <HostDashboard />;
    case 'buyer-dashboard':
      return <BuyerDashboard />;
    case 'auction':
      return <AuctionRoom />;
    default:
      return <LoginRegister />;
  }
};

export default App;