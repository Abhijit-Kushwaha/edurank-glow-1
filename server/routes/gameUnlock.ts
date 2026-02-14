/**
 * Game Unlock API Route
 * 
 * POST /api/unlock-game
 * 
 * Secure server-side transaction handler for unlocking games with coins
 * - Validates user session
 * - Verifies coin balance server-side
 * - Atomically deducts coins
 * - Creates audit trail
 * 
 * ⚠️ NEVER TRUST FRONTEND COIN VALUES
 */

import { Request, Response } from 'express';
import { supabaseAdmin, adminOperations } from '../lib/supabaseAdmin';

interface UnlockGameRequest {
  gameId: string;
  gameName: string;
  price: number; // Coins required
}

/**
 * Unlock game endpoint
 * Validates and deducts coins server-side
 */
export async function unlockGame(req: Request, res: Response) {
  try {
    // Get user from JWT token (set by auth middleware)
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User not authenticated',
      });
    }

    // Validate request body
    const { gameId, gameName, price } = req.body as UnlockGameRequest;

    if (!gameId || !gameName || typeof price !== 'number' || price <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: gameId, gameName, and price (> 0) are required',
      });
    }

    // CRITICAL: Verify coin cost matches server configuration
    // Store game prices in database to prevent frontend tampering
    const { data: gameConfig, error: configError } = await (supabaseAdmin
      .from('game_unlocks')
      .select('price')
      .eq('game_id', gameId)
      .single() as any);

    if (configError || !gameConfig) {
      console.error(`Game not found or error: ${gameId}`, configError);
      return res.status(404).json({
        success: false,
        error: 'Game not found',
      });
    }

    // Validate price matches server configuration
    if (gameConfig.price !== price) {
      return res.status(400).json({
        success: false,
        error: 'Price mismatch - potential tampering detected',
      });
    }

    // Verify user has enough coins (server-side validation)
    const hasCoins = await adminOperations.verifyUserCoins(userId, price);
    if (!hasCoins) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient coins',
      });
    }

    // Deduct coins atomically
    const deductResult = await adminOperations.deductCoins(userId, price);
    if (!deductResult.success) {
      return res.status(500).json({
        success: false,
        error: deductResult.error || 'Failed to deduct coins',
      });
    }

    // Record unlock in database
    const { error: unlockError } = await (supabaseAdmin
      .from('user_unlocks')
      .insert({
        user_id: userId,
        game_id: gameId,
        unlocked_at: new Date().toISOString(),
      }) as any);

    if (unlockError) {
      console.error('Error recording unlock:', unlockError);
      // Note: Coins were already deducted, but unlock not recorded
      // This is a critical error that should trigger alerts
      return res.status(500).json({
        success: false,
        error: 'Unlock recorded but database error occurred',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Game "${gameName}" unlocked successfully`,
      remainingCoins: deductResult.remainingCoins,
    });

  } catch (error) {
    console.error('Unexpected error in unlockGame:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Get user coin balance
 * GET /api/user/coins
 */
export async function getUserCoins(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { data, error } = await (supabaseAdmin
      .from('profiles')
      .select('coins')
      .eq('id', userId)
      .single() as any);

    if (error) {
      console.error('Error fetching coins:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch coin balance',
      });
    }

    return res.status(200).json({
      success: true,
      coins: (data as any)?.coins ?? 0,
    });

  } catch (error) {
    console.error('Unexpected error in getUserCoins:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Get game unlock status
 * GET /api/game/:gameId/status
 */
export async function getGameUnlockStatus(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { gameId } = req.params;
    if (!gameId) {
      return res.status(400).json({
        success: false,
        error: 'gameId is required',
      });
    }

    const { data, error } = await (supabaseAdmin
      .from('user_unlocks')
      .select('unlocked_at')
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .single() as any);

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (game not unlocked)
      console.error('Error checking unlock status:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to check unlock status',
      });
    }

    return res.status(200).json({
      success: true,
      unlocked: !!data,
      unlockedAt: (data as any)?.unlocked_at || null,
    });

  } catch (error) {
    console.error('Unexpected error in getGameUnlockStatus:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Consume credits (new credit-based system)
 * POST /api/consume-credits
 * 
 * Atomically consumes credits with 7-day reset cycle
 * - Validates user session
 * - Calls consume_credits RPC function
 * - Handles weekly reset automatically
 * - Returns remaining credits
 */
export async function consumeCredits(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User not authenticated',
      });
    }

    // Default to 2 credits per game use
    const amount = req.body?.amount || 2;

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount: must be a positive number',
      });
    }

    // Call the consume_credits RPC function (handles 7-day reset automatically)
    const { data, error } = await (supabaseAdmin.rpc('consume_credits', {
      uid: userId,
      amount: amount,
    }) as any);

    if (error) {
      console.error('Error consuming credits:', error);
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits or credit consumption failed',
      });
    }

    if (!data) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
      });
    }

    // Get updated credit balance
    const { data: creditData, error: creditError } = await (supabaseAdmin
      .from('user_credits')
      .select('credits_remaining, credits_used, last_reset_at')
      .eq('user_id', userId)
      .single() as any);

    if (creditError) {
      console.error('Error fetching updated credits:', creditError);
      return res.status(500).json({
        success: false,
        error: 'Credits consumed but failed to retrieve balance',
      });
    }

    return res.status(200).json({
      success: true,
      message: `${amount} credits consumed successfully`,
      creditsRemaining: creditData?.credits_remaining || 0,
      creditsUsed: creditData?.credits_used || 0,
      lastResetAt: creditData?.last_reset_at,
    });

  } catch (error) {
    console.error('Unexpected error in consumeCredits:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Get user credits
 * GET /api/user/credits
 */
export async function getUserCredits(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Call check_and_reset_credits to handle weekly reset
    const { data: resetData, error: resetError } = await (supabaseAdmin.rpc(
      'check_and_reset_credits',
      { uid: userId }
    ) as any);

    if (resetError) {
      console.error('Error checking credits reset:', resetError);
      // Fallback to direct query
      const { data: creditData, error: creditError } = await (supabaseAdmin
        .from('user_credits')
        .select('credits_remaining, credits_used, last_reset_at')
        .eq('user_id', userId)
        .single() as any);

      if (creditError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch credits',
        });
      }

      return res.status(200).json({
        success: true,
        creditsRemaining: creditData?.credits_remaining || 0,
        creditsUsed: creditData?.credits_used || 0,
        lastResetAt: creditData?.last_reset_at,
        wasReset: false,
      });
    }

    const creditInfo = (resetData && resetData.length > 0) ? resetData[0] : null;

    return res.status(200).json({
      success: true,
      creditsRemaining: creditInfo?.credits_remaining || 0,
      creditsUsed: creditInfo?.credits_used || 0,
      lastResetAt: creditInfo?.last_reset_at,
      wasReset: creditInfo?.was_reset || false,
    });

  } catch (error) {
    console.error('Unexpected error in getUserCredits:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
