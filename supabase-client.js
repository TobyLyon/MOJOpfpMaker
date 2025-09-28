// Supabase Client for Order Tracking
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';
import SUPABASE_CONFIG from './supabase-config.js';

// Initialize Supabase client (guard against missing config)
if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
    console.warn('⚠️ Supabase URL or anon key is not set. Live features will be disabled.');
}
const supabase = (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey)
    ? createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
    : { from: () => ({ select: async () => ({ data: [], error: { message: 'Supabase disabled' } }) }) };

// Order tracking functions
class OrderTracker {
    constructor() {
        this.tableName = 'paco_orders';
        this.realtimeChannel = null;
    }

    // Increment global order count
    async recordOrder(orderData = {}) {
        try {
            const orderRecord = {
                created_at: new Date().toISOString(),
                hat_id: orderData.hat || null,
                hat_name: orderData.hatName || null,
                item_id: orderData.item || null,
                item_name: orderData.itemName || null,
                total_price: orderData.total || 0,
                user_agent: navigator.userAgent,
                timestamp: Date.now()
            };

            const { data, error } = await supabase
                .from(this.tableName)
                .insert([orderRecord])
                .select();

            if (error) {
                console.error('Error recording order:', error);
                return { success: false, error };
            }

            console.log('✅ Order recorded successfully:', data);
            return { success: true, data };
        } catch (error) {
            console.error('Exception recording order:', error);
            return { success: false, error: error.message };
        }
    }

    // Get total global order count
    async getGlobalOrderCount() {
        try {
            const { count, error } = await supabase
                .from(this.tableName)
                .select('*', { count: 'exact', head: true });

            if (error) {
                console.error('Error getting order count:', error);
                return { success: false, count: 0, error };
            }

            return { success: true, count: count || 0 };
        } catch (error) {
            console.error('Exception getting order count:', error);
            return { success: false, count: 0, error: error.message };
        }
    }

    // Get today's order count
    async getTodayOrderCount() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayISO = today.toISOString();

            const { count, error } = await supabase
                .from(this.tableName)
                .select('*', { count: 'exact', head: true })
                .gte('created_at', todayISO);

            if (error) {
                console.error('Error getting today order count:', error);
                return { success: false, count: 0, error };
            }

            return { success: true, count: count || 0 };
        } catch (error) {
            console.error('Exception getting today order count:', error);
            return { success: false, count: 0, error: error.message };
        }
    }

    // Get popular traits
    async getPopularTraits() {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('hat_name, item_name')
                .not('hat_name', 'is', null)
                .not('item_name', 'is', null);

            if (error) {
                console.error('Error getting popular traits:', error);
                return { success: false, data: [], error };
            }

            // Count trait popularity
            const hatCounts = {};
            const itemCounts = {};

            data.forEach(order => {
                if (order.hat_name) {
                    hatCounts[order.hat_name] = (hatCounts[order.hat_name] || 0) + 1;
                }
                if (order.item_name) {
                    itemCounts[order.item_name] = (itemCounts[order.item_name] || 0) + 1;
                }
            });

            return {
                success: true,
                data: {
                    popularHats: Object.entries(hatCounts).sort((a, b) => b[1] - a[1]).slice(0, 3),
                    popularItems: Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)
                }
            };
        } catch (error) {
            console.error('Exception getting popular traits:', error);
            return { success: false, data: [], error: error.message };
        }
    }

    // Test connection
    async testConnection() {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('count', { count: 'exact', head: true });

            if (error) {
                console.error('Connection test failed:', error);
                return { success: false, error };
            }

            console.log('✅ Supabase connection successful');
            return { success: true, message: 'Connection successful' };
        } catch (error) {
            console.error('Connection test exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Start real-time subscription for live order updates
    subscribeToLiveOrders(onNewOrder, onOrderUpdate) {
        try {
            // Unsubscribe from existing channel if any
            this.unsubscribeFromLiveOrders();

            // Create new real-time channel
            this.realtimeChannel = supabase
                .channel('paco_orders_channel')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: this.tableName
                    },
                    (payload) => {
                        console.log('🔴 LIVE: New order received!', payload);
                        if (onNewOrder) {
                            onNewOrder(payload.new);
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: this.tableName
                    },
                    (payload) => {
                        console.log('🔄 LIVE: Order updated!', payload);
                        if (onOrderUpdate) {
                            onOrderUpdate(payload.new);
                        }
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('✅ Live order tracking activated!');
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('❌ Real-time subscription failed');
                    }
                });

            return { success: true, channel: this.realtimeChannel };
        } catch (error) {
            console.error('Error setting up real-time subscription:', error);
            return { success: false, error: error.message };
        }
    }

    // Stop real-time subscription
    unsubscribeFromLiveOrders() {
        if (this.realtimeChannel) {
            supabase.removeChannel(this.realtimeChannel);
            this.realtimeChannel = null;
            console.log('🔌 Real-time subscription stopped');
        }
    }

    // Get recent orders for live feed
    async getRecentOrders(limit = 10) {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('id, created_at, hat_name, item_name, total_price')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Error getting recent orders:', error);
                return { success: false, data: [], error };
            }

            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Exception getting recent orders:', error);
            return { success: false, data: [], error: error.message };
        }
    }

    // === GAME LEADERBOARD FUNCTIONS ===

    // Record game score
    async recordGameScore(scoreData) {
        try {
            // Server-side validation - ENABLED FOR SECURITY
            console.log('🔍 Score submission with validation enabled:', scoreData);
            const validation = this.validateScoreSubmission(scoreData);
            console.log('🔍 Validation result:', validation);
            
            if (!validation.valid) {
                console.error('🚨 VALIDATION FAILED - SCORE REJECTED:');
                console.error('🚨 User:', scoreData.username, '(', scoreData.user_id, ')');
                console.error('🚨 Score:', scoreData.score);
                console.error('🚨 Reasons:', validation.reasons);
                console.error('🚨 Full data:', scoreData);
                return { success: false, error: `Validation failed: ${validation.reasons.join(', ')}` };
            }

            // CRITICAL FIX: Convert weekly format to database-compatible date
            const databaseDate = scoreData.game_date.replace('-WEEK', '');
            console.log(`🔧 Converting date format: "${scoreData.game_date}" → "${databaseDate}"`);

            const scoreRecord = {
                user_id: scoreData.user_id,
                username: scoreData.username,
                display_name: scoreData.display_name,
                profile_image: scoreData.profile_image,
                score: scoreData.score,
                game_date: databaseDate, // Use converted date format
                created_at: scoreData.created_at || new Date().toISOString(),
                // Add basic metadata
                user_agent: navigator.userAgent,
                ...(scoreData.session_id && { session_id: scoreData.session_id }),
                ...(scoreData.game_time && { game_time: scoreData.game_time }),
                ...(scoreData.platforms_jumped && { platforms_jumped: scoreData.platforms_jumped }),
                ...(scoreData.checksum && { checksum: scoreData.checksum })
            };
            
            // Check if user already has a score for today - FIXED QUERY
            let existingScores, fetchError;
            const queryResult = await supabase
                .from('game_scores')
                .select('*')
                .eq('user_id', scoreData.user_id)
                .eq('game_date', databaseDate)
                .order('score', { ascending: false })
                .limit(1);
            
            existingScores = queryResult.data;
            fetchError = queryResult.error;

            if (fetchError) {
                console.error('❌ CRITICAL: Database query failed:', fetchError);
                console.error('❌ Query details:', {
                    table: 'game_scores',
                    user_id: scoreData.user_id,
                    game_date: scoreData.game_date,
                    error_message: fetchError.message,
                    error_details: fetchError.details,
                    error_hint: fetchError.hint,
                    error_code: fetchError.code
                });
                
                // EMERGENCY FALLBACK - try without date filter
                console.log('🚨 Attempting emergency fallback query...');
                const { data: fallbackScores, error: fallbackError } = await supabase
                    .from('game_scores')
                    .select('*')
                    .eq('user_id', scoreData.user_id)
                    .order('created_at', { ascending: false })
                    .limit(5);
                
                if (fallbackError) {
                    console.error('❌ Emergency fallback also failed:', fallbackError);
                    return { success: false, error: `Database connection failed: ${fetchError.message}` };
                }
                
                console.log('✅ Emergency fallback succeeded, proceeding with submission...');
                // Filter fallback scores to only include today's date (using database format)
                const filteredScores = fallbackScores.filter(score => score.game_date === databaseDate);
                console.log(`🔍 Found ${filteredScores.length} scores for today from fallback query`);
                
                // Reassign to make it work like the original query
                existingScores = filteredScores;
            }

            let data, error;
            
            if (existingScores && existingScores.length > 0) {
                const existingScore = existingScores[0];
                console.log(`🔍 FOUND EXISTING SCORE: ${existingScore.score} (ID: ${existingScore.id})`);
                console.log(`🔍 NEW SCORE: ${scoreData.score}`);
                console.log(`🔍 IS NEW SCORE HIGHER? ${scoreData.score > existingScore.score}`);
                
                if (scoreData.score > existingScore.score) {
                    // New score is higher - use UPSERT to handle constraint properly
                    console.log(`🚀 UPSERTING RECORD: ${existingScore.score} TO ${scoreData.score}`);
                    
                    // SAFER DATABASE OPERATION - try multiple methods
                    console.log('🔧 Attempting database update...');
                    
                    // Method 1: Try simple UPDATE first
                    const updateResult = await supabase
                        .from('game_scores')
                        .update({
                            score: scoreRecord.score,
                            created_at: scoreRecord.created_at,
                            user_agent: scoreRecord.user_agent
                        })
                        .eq('id', existingScore.id)
                        .select();
                    
                    if (updateResult.error) {
                        console.log('🚨 UPDATE failed, trying INSERT...');
                        
                        // Method 2: If update fails, try INSERT with error handling
                        const insertResult = await supabase
                            .from('game_scores')
                            .insert(scoreRecord)
                            .select();
                        
                        data = insertResult.data;
                        error = insertResult.error;
                        
                        if (error) {
                            console.error('❌ INSERT ALSO FAILED:', error);
                            console.error('❌ Scorecard data:', scoreRecord);
                        } else {
                            console.log('✅ INSERT succeeded after UPDATE failed');
                        }
                    } else {
                        data = updateResult.data;
                        error = updateResult.error;
                        console.log('✅ Score updated successfully via UPDATE');
                    }
                } else {
                    // Existing score is higher or equal - don't update
                    console.log(`📊 Score ${scoreData.score} not higher than existing score ${existingScore.score}, keeping existing`);
                    return { success: true, data: existingScore, skipped: true };
                }
            } else {
                // No existing score - insert new record with enhanced error handling
                console.log('🎯 No existing score found, inserting new record...');
                console.log('🎯 Score record to insert:', scoreRecord);
                
                const insertResult = await supabase
                    .from('game_scores')
                    .insert([scoreRecord])
                    .select();
                
                data = insertResult.data;
                error = insertResult.error;
                
                if (!error) {
                    console.log('✅ First score recorded successfully:', data);
                    console.log('✅ New record ID:', data[0]?.id);
                } else {
                    console.error('❌ NEW SCORE INSERT FAILED:', error);
                    console.error('❌ Error code:', error.code);
                    console.error('❌ Error message:', error.message);
                    console.error('❌ Error details:', error.details);
                    console.error('❌ Error hint:', error.hint);
                }
            }

            if (error) {
                console.error('❌ ERROR RECORDING GAME SCORE:', error);
                console.error('❌ Score data that failed:', scoreRecord);
                console.error('❌ Full error object:', JSON.stringify(error, null, 2));
                return { success: false, error };
            }

            console.log('✅ Game score recorded successfully:', data);
            console.log('✅ Recorded score data:', data[0]);
            return { success: true, data };
        } catch (error) {
            console.error('Exception recording game score:', error);
            return { success: false, error: error.message };
        }
    }

    // Minimal validation - only protect against code injection and obvious manipulation
    validateScoreSubmission(scoreData) {
        const validation = { valid: true, reasons: [] };
        const score = scoreData.score;
        const now = Date.now();
        
        // 1. Basic data type validation (prevent code injection)
        if (typeof score !== 'number' || score < 0 || !Number.isFinite(score) || isNaN(score)) {
            validation.valid = false;
            validation.reasons.push('Invalid score data type');
        }
        
        // 2. Extreme value protection (prevent obvious manipulation/overflow)
        if (score > 10000000) { // 10 million - way beyond any realistic gameplay
            validation.valid = false;
            validation.reasons.push('Score exceeds maximum possible value');
        }
        
        // 3. Basic rate limiting (prevent spam/DOS)
        const submissionKey = `last_submission_${scoreData.user_id}`;
        const lastSubmission = localStorage.getItem(submissionKey);
        if (lastSubmission && (now - parseInt(lastSubmission)) < 3000) { // 3 second cooldown
            validation.valid = false;
            validation.reasons.push('Please wait before submitting another score');
        }
        
        // 4. Daily submission limit (prevent abuse)
        const dailyCountKey = `daily_submissions_${scoreData.user_id}_${scoreData.game_date}`;
        const dailyCount = parseInt(localStorage.getItem(dailyCountKey) || '0');
        if (dailyCount >= 200) { // Very generous limit
            validation.valid = false;
            validation.reasons.push('Daily submission limit reached');
        }
        
        // Update rate limiting counters
        if (validation.valid) {
            localStorage.setItem(submissionKey, now.toString());
            localStorage.setItem(dailyCountKey, (dailyCount + 1).toString());
        }
        
        // 5. Log validation results for monitoring
        console.log(`🔍 Minimal validation for ${scoreData.username}: Score ${score} - ${validation.valid ? 'ACCEPTED' : 'REJECTED'}`);
        if (validation.reasons.length > 0) {
            console.log('📝 Validation notes:', validation.reasons);
        }
        
        return validation;
    }

    // Get current PST date (matches leaderboard.js getCurrentGameDate)
    getCurrentPSTDate() {
        // Get current PST date (Pacific Standard Time - UTC-8)
        const now = new Date();
        
        // Convert to PST by subtracting 8 hours from UTC
        const pstOffset = -8 * 60; // PST is UTC-8 (in minutes)
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const pstTime = new Date(utc + (pstOffset * 60000));
        
        // Format as YYYY-MM-DD
        const year = pstTime.getFullYear();
        const month = String(pstTime.getMonth() + 1).padStart(2, '0');
        const day = String(pstTime.getDate()).padStart(2, '0');
        const gameDate = `${year}-${month}-${day}`;
        
        console.log(`📅 Supabase using PST date: ${gameDate} (PST time: ${pstTime.toLocaleString()})`);
        return gameDate;
    }

    // Get this week's Monday date in YYYY-MM-DD format (for weekly contest)
    getCurrentWeekMondayDate() {
        const pstTime = this.getPSTTime();
        const currentDay = pstTime.getDay(); // 0 = Sunday, 1 = Monday
        
        // Calculate days to Monday
        let mondayOffset;
        if (currentDay === 0) { // Sunday - use previous week's Monday
            mondayOffset = -6;
        } else if (currentDay >= 1 && currentDay <= 4) { // Mon-Thu - current week
            mondayOffset = 1 - currentDay;
        } else { // Fri-Sat - still current week until official reset
            mondayOffset = 1 - currentDay;
        }
        
        const monday = new Date(pstTime);
        monday.setDate(pstTime.getDate() + mondayOffset);
        
        const year = monday.getFullYear();
        const month = String(monday.getMonth() + 1).padStart(2, '0');
        const day = String(monday.getDate()).padStart(2, '0');
        const mondayDate = `${year}-${month}-${day}`;
        
        console.log(`📅 This week's Monday: ${mondayDate} (${monday.toDateString()})`);
        return mondayDate;
    }

    // Helper to get PST time
    getPSTTime(date = new Date()) {
        const pstOffset = -8 * 60;
        const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
        const pstTime = new Date(utc + (pstOffset * 60000));
        return pstTime;
    }

    // Get this week's leaderboard - best score per user from Monday-Thursday contest
    async getTodayLeaderboard() {
        try {
            console.log('📊 Getting weekly contest leaderboard (Monday-Thursday)...');
            
            // Always use fallback method for weekly contest (more flexible)
            return await this.getWeeklyContestLeaderboard();
        } catch (error) {
            console.error('Exception getting weekly leaderboard:', error);
            return { success: false, data: [], error: error.message };
        }
    }

    // Get weekly contest leaderboard (Monday-Thursday) - best score per user
    async getWeeklyContestLeaderboard() {
        try {
            // Get this week's Monday date
            const mondayDate = this.getCurrentWeekMondayDate();
            const today = this.getCurrentPSTDate();
            
            console.log(`📅 Getting scores from ${mondayDate} (Monday) to ${today} (today)`);

            // Get all scores from Monday through today
            const { data, error } = await supabase
                .from('game_scores')
                .select('*')
                .gte('game_date', mondayDate)  // From Monday
                .lte('game_date', today)       // Through today
                .order('score', { ascending: false });

            if (error) {
                console.error('Error getting weekly contest leaderboard:', error);
                return { success: false, data: [], error };
            }

            console.log(`📊 Found ${data?.length || 0} total scores from ${mondayDate} to ${today}`);

            // Deduplicate - keep only the best score per user for the week
            const userBestScores = new Map();
            
            (data || []).forEach(entry => {
                const existingScore = userBestScores.get(entry.user_id);
                if (!existingScore || entry.score > existingScore.score) {
                    userBestScores.set(entry.user_id, entry);
                }
            });

            const finalLeaderboard = Array.from(userBestScores.values())
                .sort((a, b) => b.score - a.score)
                .slice(0, 50); // Top 50

            console.log(`✅ Weekly contest leaderboard: ${finalLeaderboard.length} unique players`);
            console.log('🏆 Top 3 weekly scores:', finalLeaderboard.slice(0, 3).map(e => 
                `${e.username}: ${e.score} (${e.game_date})`
            ));

            return { success: true, data: finalLeaderboard };
        } catch (error) {
            console.error('Exception getting weekly contest leaderboard:', error);
            return { success: false, data: [], error: error.message };
        }
    }

    // Fallback method - fetch all scores and deduplicate client-side
    async getTodayLeaderboardFallback() {
        try {
            // Get current PST date to match leaderboard.js
            const today = this.getCurrentPSTDate();

            const { data, error } = await supabase
                .from('game_scores')
                .select('*')
                .eq('game_date', today)
                .order('score', { ascending: false });

            if (error) {
                console.error('Error getting today leaderboard fallback:', error);
                return { success: false, data: [], error };
            }

            // Deduplicate - keep only the best score per user
            const userBestScores = new Map();
            
            (data || []).forEach(entry => {
                const existingScore = userBestScores.get(entry.user_id);
                if (!existingScore || entry.score > existingScore.score) {
                    userBestScores.set(entry.user_id, entry);
                }
            });

            // Convert back to array and sort by score
            const deduplicatedData = Array.from(userBestScores.values())
                .sort((a, b) => b.score - a.score)
                .slice(0, 50);

            console.log('📊 Client-side deduplication: reduced', data?.length || 0, 'entries to', deduplicatedData.length, 'unique users');
            return { success: true, data: deduplicatedData };
        } catch (error) {
            console.error('Exception in leaderboard fallback:', error);
            return { success: false, data: [], error: error.message };
        }
    }

    // Get user's best score for today
    async getUserBestScore(userId) {
        try {
            // Get current PST date to match leaderboard.js
            const today = this.getCurrentPSTDate();

            const { data, error } = await supabase
                .from('game_scores')
                .select('score')
                .eq('user_id', userId)
                .eq('game_date', today)
                .order('score', { ascending: false })
                .limit(1);

            if (error) {
                console.error('Error getting user best score:', error);
                return { success: false, score: 0, error };
            }

            const bestScore = data && data.length > 0 ? data[0].score : 0;
            return { success: true, score: bestScore };
        } catch (error) {
            console.error('Exception getting user best score:', error);
            return { success: false, score: 0, error: error.message };
        }
    }

    // Get ALL-TIME leaderboard - all scores from all dates
    async getAllTimeLeaderboard() {
        try {
            console.log('📊 Loading ALL-TIME leaderboard from ALL dates...');
            
            const { data, error } = await supabase
                .from('game_scores')
                .select('*')
                .order('score', { ascending: false })
                .limit(500); // Large limit to get all historical scores
            
            if (error) {
                console.error('❌ All-time leaderboard query failed:', error);
                return { success: false, data: [], error };
            }
            
            console.log(`📊 Retrieved ${data.length} total scores from database`);
            
            // Log date range for debugging
            if (data.length > 0) {
                const dates = [...new Set(data.map(entry => entry.game_date))].sort();
                console.log(`📅 Date range in database: ${dates[0]} to ${dates[dates.length - 1]}`);
                console.log(`📅 All dates found: ${dates.join(', ')}`);
            }
            
            return { success: true, data: data || [] };
            
        } catch (error) {
            console.error('Exception getting all-time leaderboard:', error);
            return { success: false, data: [], error: error.message };
        }
    }

    // Get leaderboard stats
    async getLeaderboardStats() {
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('game_scores')
                .select('score')
                .eq('game_date', today);

            if (error) {
                console.error('Error getting leaderboard stats:', error);
                return { success: false, stats: {}, error };
            }

            const scores = data.map(item => item.score);
            const stats = {
                totalPlayers: scores.length,
                averageScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
                topScore: scores.length > 0 ? Math.max(...scores) : 0,
                gameDate: today
            };

            return { success: true, stats };
        } catch (error) {
            console.error('Exception getting leaderboard stats:', error);
            return { success: false, stats: {}, error: error.message };
        }
    }

    // Subscribe to live game scores
    subscribeToGameScores(onNewScore, onScoreUpdate) {
        try {
            // Unsubscribe from existing channel if any
            this.unsubscribeFromGameScores();

            // Create new real-time channel for game scores
            this.gameScoreChannel = supabase
                .channel('game_scores_channel')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'game_scores'
                    },
                    (payload) => {
                        console.log('🔴 LIVE: New game score!', payload);
                        if (onNewScore) {
                            onNewScore(payload.new);
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'game_scores'
                    },
                    (payload) => {
                        console.log('🔄 LIVE: Game score updated!', payload);
                        if (onScoreUpdate) {
                            onScoreUpdate(payload.new);
                        }
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('✅ Live game score tracking activated!');
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('❌ Game score subscription failed');
                    }
                });

            return { success: true, channel: this.gameScoreChannel };
        } catch (error) {
            console.error('Error setting up game score subscription:', error);
            return { success: false, error: error.message };
        }
    }

    // Stop game score subscription
    unsubscribeFromGameScores() {
        if (this.gameScoreChannel) {
            supabase.removeChannel(this.gameScoreChannel);
            this.gameScoreChannel = null;
            console.log('🔌 Game score subscription stopped');
        }
    }
}

// Export singleton instance
export const orderTracker = new OrderTracker();
export default orderTracker;