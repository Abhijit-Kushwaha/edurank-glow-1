export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      achievement_progress: {
        Row: {
          achievement_id: string
          created_at: string
          current_value: number
          id: string
          last_updated: string
          metadata: Json | null
          target_value: number
          user_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string
          current_value?: number
          id?: string
          last_updated?: string
          metadata?: Json | null
          target_value?: number
          user_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string
          current_value?: number
          id?: string
          last_updated?: string
          metadata?: Json | null
          target_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_progress_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          anti_cheat_rules: Json | null
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          is_hidden: boolean
          name: string
          requirement_type: string
          requirement_value: number
          reward_type: string
          reward_value: Json
          sort_order: number
          tier: string
          unlock_formula: string | null
        }
        Insert: {
          anti_cheat_rules?: Json | null
          category?: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          is_hidden?: boolean
          name: string
          requirement_type: string
          requirement_value: number
          reward_type?: string
          reward_value?: Json
          sort_order?: number
          tier?: string
          unlock_formula?: string | null
        }
        Update: {
          anti_cheat_rules?: Json | null
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_hidden?: boolean
          name?: string
          requirement_type?: string
          requirement_value?: number
          reward_type?: string
          reward_value?: Json
          sort_order?: number
          tier?: string
          unlock_formula?: string | null
        }
        Relationships: []
      }
      battle_answers: {
        Row: {
          battle_id: string
          created_at: string
          id: string
          is_correct: boolean
          points_earned: number
          question_id: string
          selected_answer: number | null
          streak_count: number
          time_taken_seconds: number
          user_id: string
        }
        Insert: {
          battle_id: string
          created_at?: string
          id?: string
          is_correct?: boolean
          points_earned?: number
          question_id: string
          selected_answer?: number | null
          streak_count?: number
          time_taken_seconds?: number
          user_id: string
        }
        Update: {
          battle_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          points_earned?: number
          question_id?: string
          selected_answer?: number | null
          streak_count?: number
          time_taken_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_answers_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "battle_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_leaderboard: {
        Row: {
          best_win_streak: number
          brain_points: number
          created_at: string
          daily_points: number
          display_name: string
          id: string
          last_battle_date: string | null
          total_battles: number
          total_losses: number
          total_wins: number
          updated_at: string
          user_id: string
          weekly_points: number
          win_streak: number
        }
        Insert: {
          best_win_streak?: number
          brain_points?: number
          created_at?: string
          daily_points?: number
          display_name?: string
          id?: string
          last_battle_date?: string | null
          total_battles?: number
          total_losses?: number
          total_wins?: number
          updated_at?: string
          user_id: string
          weekly_points?: number
          win_streak?: number
        }
        Update: {
          best_win_streak?: number
          brain_points?: number
          created_at?: string
          daily_points?: number
          display_name?: string
          id?: string
          last_battle_date?: string | null
          total_battles?: number
          total_losses?: number
          total_wins?: number
          updated_at?: string
          user_id?: string
          weekly_points?: number
          win_streak?: number
        }
        Relationships: []
      }
      battle_players: {
        Row: {
          battle_id: string
          display_name: string
          id: string
          is_ready: boolean
          joined_at: string
          power_ups: Json
          score: number
          user_id: string
        }
        Insert: {
          battle_id: string
          display_name?: string
          id?: string
          is_ready?: boolean
          joined_at?: string
          power_ups?: Json
          score?: number
          user_id: string
        }
        Update: {
          battle_id?: string
          display_name?: string
          id?: string
          is_ready?: boolean
          joined_at?: string
          power_ups?: Json
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_players_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_questions: {
        Row: {
          battle_id: string
          correct_answer: number
          created_at: string
          difficulty: string
          id: string
          options: Json
          order_index: number
          question_text: string
          time_limit: number
        }
        Insert: {
          battle_id: string
          correct_answer: number
          created_at?: string
          difficulty?: string
          id?: string
          options?: Json
          order_index?: number
          question_text: string
          time_limit?: number
        }
        Update: {
          battle_id?: string
          correct_answer?: number
          created_at?: string
          difficulty?: string
          id?: string
          options?: Json
          order_index?: number
          question_text?: string
          time_limit?: number
        }
        Relationships: [
          {
            foreignKeyName: "battle_questions_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      battles: {
        Row: {
          battle_code: string
          created_at: string
          creator_id: string
          current_question: number
          difficulty: string
          ended_at: string | null
          id: string
          max_players: number
          num_questions: number
          started_at: string | null
          status: string
          subject: string
          winner_id: string | null
        }
        Insert: {
          battle_code: string
          created_at?: string
          creator_id: string
          current_question?: number
          difficulty?: string
          ended_at?: string | null
          id?: string
          max_players?: number
          num_questions?: number
          started_at?: string | null
          status?: string
          subject: string
          winner_id?: string | null
        }
        Update: {
          battle_code?: string
          created_at?: string
          creator_id?: string
          current_question?: number
          difficulty?: string
          ended_at?: string | null
          id?: string
          max_players?: number
          num_questions?: number
          started_at?: string | null
          status?: string
          subject?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      brain_points_log: {
        Row: {
          amount: number
          battle_id: string | null
          created_at: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          battle_id?: string | null
          created_at?: string
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          battle_id?: string | null
          created_at?: string
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brain_points_log_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      call_signals: {
        Row: {
          callee_id: string
          caller_id: string
          created_at: string
          id: string
          signal_data: Json
          signal_type: string
        }
        Insert: {
          callee_id: string
          caller_id: string
          created_at?: string
          id?: string
          signal_data?: Json
          signal_type: string
        }
        Update: {
          callee_id?: string
          caller_id?: string
          created_at?: string
          id?: string
          signal_data?: Json
          signal_type?: string
        }
        Relationships: []
      }
      channel_messages: {
        Row: {
          attachments: Json | null
          channel_id: string
          content: string | null
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          is_pinned: boolean
          message_type: string
          reply_to: string | null
          sender_id: string
        }
        Insert: {
          attachments?: Json | null
          channel_id: string
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          message_type?: string
          reply_to?: string | null
          sender_id: string
        }
        Update: {
          attachments?: Json | null
          channel_id?: string
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          message_type?: string
          reply_to?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "channel_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          channel_type: string
          classroom_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_archived: boolean
          name: string
          org_id: string
          position: number
          updated_at: string
        }
        Insert: {
          channel_type?: string
          classroom_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name: string
          org_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          channel_type?: string
          classroom_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          org_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      classroom_members: {
        Row: {
          classroom_id: string
          enrolled_at: string
          enrolled_by: string | null
          id: string
          restricted_at: string | null
          restriction_reason: string | null
          role: string
          status: string
          user_id: string
        }
        Insert: {
          classroom_id: string
          enrolled_at?: string
          enrolled_by?: string | null
          id?: string
          restricted_at?: string | null
          restriction_reason?: string | null
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          classroom_id?: string
          enrolled_at?: string
          enrolled_by?: string | null
          id?: string
          restricted_at?: string | null
          restriction_reason?: string | null
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classroom_members_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_members_enrolled_by_fkey"
            columns: ["enrolled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classrooms: {
        Row: {
          clone_of: string | null
          cover_color: string
          created_at: string
          department_id: string | null
          description: string | null
          end_date: string | null
          enrollment_mode: string
          id: string
          name: string
          org_id: string | null
          orphaned_at: string | null
          orphaned_reason: string | null
          owner_id: string
          start_date: string | null
          status: string
          student_cap: number | null
          subject: string | null
          updated_at: string
        }
        Insert: {
          clone_of?: string | null
          cover_color?: string
          created_at?: string
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          enrollment_mode?: string
          id?: string
          name: string
          org_id?: string | null
          orphaned_at?: string | null
          orphaned_reason?: string | null
          owner_id: string
          start_date?: string | null
          status?: string
          student_cap?: number | null
          subject?: string | null
          updated_at?: string
        }
        Update: {
          clone_of?: string | null
          cover_color?: string
          created_at?: string
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          enrollment_mode?: string
          id?: string
          name?: string
          org_id?: string | null
          orphaned_at?: string | null
          orphaned_reason?: string | null
          owner_id?: string
          start_date?: string | null
          status?: string
          student_cap?: number | null
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classrooms_clone_of_fkey"
            columns: ["clone_of"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classrooms_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classrooms_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classrooms_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          assigned_to: string
          assigned_user_ids: string[]
          body: Json
          classroom_id: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          is_anonymous_submission: boolean
          late_penalty_percent_per_day: number
          late_submission_allowed: boolean
          max_attempts: number
          org_id: string | null
          points: number
          prerequisite_content_id: string | null
          score_counts_as: string
          status: string
          title: string
          type: string
          updated_at: string
          visibility_end: string | null
          visibility_start: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          assigned_to?: string
          assigned_user_ids?: string[]
          body?: Json
          classroom_id?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          is_anonymous_submission?: boolean
          late_penalty_percent_per_day?: number
          late_submission_allowed?: boolean
          max_attempts?: number
          org_id?: string | null
          points?: number
          prerequisite_content_id?: string | null
          score_counts_as?: string
          status?: string
          title: string
          type: string
          updated_at?: string
          visibility_end?: string | null
          visibility_start?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          assigned_to?: string
          assigned_user_ids?: string[]
          body?: Json
          classroom_id?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          is_anonymous_submission?: boolean
          late_penalty_percent_per_day?: number
          late_submission_allowed?: boolean
          max_attempts?: number
          org_id?: string | null
          points?: number
          prerequisite_content_id?: string | null
          score_counts_as?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          visibility_end?: string | null
          visibility_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_prerequisite_content_id_fkey"
            columns: ["prerequisite_content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          color: string
          created_at: string
          created_by: string
          id: string
          is_default: boolean
          name: string
          org_id: string
          position: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by: string
          id?: string
          is_default?: boolean
          name: string
          org_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          id?: string
          is_default?: boolean
          name?: string
          org_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_challenges: {
        Row: {
          base_xp_reward: number
          bonus_multiplier: number
          challenge_type: string
          created_at: string
          description: string
          difficulty: string
          id: string
          is_active: boolean
          target_value: number
          title: string
        }
        Insert: {
          base_xp_reward?: number
          bonus_multiplier?: number
          challenge_type: string
          created_at?: string
          description: string
          difficulty?: string
          id?: string
          is_active?: boolean
          target_value: number
          title: string
        }
        Update: {
          base_xp_reward?: number
          bonus_multiplier?: number
          challenge_type?: string
          created_at?: string
          description?: string
          difficulty?: string
          id?: string
          is_active?: boolean
          target_value?: number
          title?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          org_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          org_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back: string
          created_at: string
          difficulty: string
          ease_factor: number
          front: string
          id: string
          interval_days: number
          is_ai_generated: boolean
          last_reviewed_at: string | null
          next_review_at: string
          repetitions: number
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          back: string
          created_at?: string
          difficulty?: string
          ease_factor?: number
          front: string
          id?: string
          interval_days?: number
          is_ai_generated?: boolean
          last_reviewed_at?: string | null
          next_review_at?: string
          repetitions?: number
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          back?: string
          created_at?: string
          difficulty?: string
          ease_factor?: number
          front?: string
          id?: string
          interval_days?: number
          is_ai_generated?: boolean
          last_reviewed_at?: string | null
          next_review_at?: string
          repetitions?: number
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      friend_invite_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          is_used: boolean
          used_by: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          is_used?: boolean
          used_by?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          used_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      global_topic_stats: {
        Row: {
          avg_accuracy: number
          avg_time_seconds: number
          id: string
          topic_id: string
          total_attempts: number
          total_correct: number
          updated_at: string
        }
        Insert: {
          avg_accuracy?: number
          avg_time_seconds?: number
          id?: string
          topic_id: string
          total_attempts?: number
          total_correct?: number
          updated_at?: string
        }
        Update: {
          avg_accuracy?: number
          avg_time_seconds?: number
          id?: string
          topic_id?: string
          total_attempts?: number
          total_correct?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_topic_stats_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: true
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          classroom_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          org_id: string | null
          resend_count: number
          role: string
          status: string
          token: string
        }
        Insert: {
          classroom_id?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          org_id?: string | null
          resend_count?: number
          role: string
          status?: string
          token: string
        }
        Update: {
          classroom_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          org_id?: string | null
          resend_count?: number
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_pages: {
        Row: {
          classroom_id: string | null
          content: Json
          cover_image: string | null
          created_at: string
          created_by: string
          icon: string | null
          id: string
          is_published: boolean
          last_edited_by: string | null
          org_id: string
          parent_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          classroom_id?: string | null
          content?: Json
          cover_image?: string | null
          created_at?: string
          created_by: string
          icon?: string | null
          id?: string
          is_published?: boolean
          last_edited_by?: string | null
          org_id: string
          parent_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          classroom_id?: string | null
          content?: Json
          cover_image?: string | null
          created_at?: string
          created_by?: string
          icon?: string | null
          id?: string
          is_published?: boolean
          last_edited_by?: string | null
          org_id?: string
          parent_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_pages_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_pages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_pages_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_pages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_pages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "knowledge_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_stats: {
        Row: {
          average_score: number
          best_score: number
          created_at: string
          current_streak: number
          display_name: string
          id: string
          last_activity_date: string | null
          longest_streak: number
          total_correct: number
          total_questions: number
          total_quizzes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          average_score?: number
          best_score?: number
          created_at?: string
          current_streak?: number
          display_name?: string
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          total_correct?: number
          total_questions?: number
          total_quizzes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          average_score?: number
          best_score?: number
          created_at?: string
          current_streak?: number
          display_name?: string
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          total_correct?: number
          total_questions?: number
          total_quizzes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learning_nodes: {
        Row: {
          bloom_level: string
          created_at: string
          difficulty: number
          estimated_mins: number
          id: string
          linked_nodes: string[]
          org_id: string | null
          prerequisites: string[]
          subject: string
          title: string
          type: string
        }
        Insert: {
          bloom_level?: string
          created_at?: string
          difficulty?: number
          estimated_mins?: number
          id?: string
          linked_nodes?: string[]
          org_id?: string | null
          prerequisites?: string[]
          subject: string
          title: string
          type: string
        }
        Update: {
          bloom_level?: string
          created_at?: string
          difficulty?: number
          estimated_mins?: number
          id?: string
          linked_nodes?: string[]
          org_id?: string | null
          prerequisites?: string[]
          subject?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_nodes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_ai_sessions: {
        Row: {
          classroom_id: string | null
          content_ref_id: string | null
          content_ref_type: string | null
          created_at: string
          id: string
          messages: Json
          summary: string | null
          tokens_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          classroom_id?: string | null
          content_ref_id?: string | null
          content_ref_type?: string | null
          created_at?: string
          id?: string
          messages?: Json
          summary?: string | null
          tokens_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          classroom_id?: string | null
          content_ref_id?: string | null
          content_ref_type?: string | null
          created_at?: string
          id?: string
          messages?: Json
          summary?: string | null
          tokens_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_ai_sessions_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_ai_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_announcements: {
        Row: {
          body: string
          classroom_id: string | null
          created_at: string
          created_by: string
          id: string
          org_id: string | null
          title: string
        }
        Insert: {
          body: string
          classroom_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          org_id?: string | null
          title: string
        }
        Update: {
          body?: string
          classroom_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          org_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_announcements_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_announcements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_recycle_bin: {
        Row: {
          created_at: string
          deleted_by: string
          id: string
          item_id: string
          item_snapshot: Json
          item_type: string
          permanent_delete_at: string
        }
        Insert: {
          created_at?: string
          deleted_by: string
          id?: string
          item_id: string
          item_snapshot: Json
          item_type: string
          permanent_delete_at: string
        }
        Update: {
          created_at?: string
          deleted_by?: string
          id?: string
          item_id?: string
          item_snapshot?: Json
          item_type?: string
          permanent_delete_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_recycle_bin_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_custom_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          member_id: string
          role_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          member_id: string
          role_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          member_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_custom_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_custom_roles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "classroom_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_custom_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_read: boolean
          message_type: string
          receiver_id: string
          sender_id: string
          shared_content: Json | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          receiver_id: string
          sender_id: string
          shared_content?: Json | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          receiver_id?: string
          sender_id?: string
          shared_content?: Json | null
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: string
          created_at: string
          id: string
          is_ai_generated: boolean
          todo_id: string
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          todo_id: string
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          todo_id?: string
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          ai_enabled: boolean
          ai_kill_switch: boolean
          content_approval_required: boolean
          created_at: string
          data_retention_days: number
          domain: string | null
          grading_lock_days: number
          id: string
          invite_code: string
          invite_mode: string
          late_penalty_percent_per_day: number
          late_submission_policy: string
          max_ai_tokens_per_day_per_student: number
          max_quiz_retakes: number
          name: string
          plan: string
          score_counts_as: string
          status: string
          updated_at: string
        }
        Insert: {
          ai_enabled?: boolean
          ai_kill_switch?: boolean
          content_approval_required?: boolean
          created_at?: string
          data_retention_days?: number
          domain?: string | null
          grading_lock_days?: number
          id?: string
          invite_code?: string
          invite_mode?: string
          late_penalty_percent_per_day?: number
          late_submission_policy?: string
          max_ai_tokens_per_day_per_student?: number
          max_quiz_retakes?: number
          name: string
          plan?: string
          score_counts_as?: string
          status?: string
          updated_at?: string
        }
        Update: {
          ai_enabled?: boolean
          ai_kill_switch?: boolean
          content_approval_required?: boolean
          created_at?: string
          data_retention_days?: number
          domain?: string | null
          grading_lock_days?: number
          id?: string
          invite_code?: string
          invite_mode?: string
          late_penalty_percent_per_day?: number
          late_submission_policy?: string
          max_ai_tokens_per_day_per_student?: number
          max_quiz_retakes?: number
          name?: string
          plan?: string
          score_counts_as?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      pomodoro_sessions: {
        Row: {
          break_duration_mins: number
          completed_pomodoros: number
          created_at: string
          ended_at: string | null
          id: string
          started_at: string
          subject: string | null
          total_focus_mins: number
          user_id: string
          work_duration_mins: number
        }
        Insert: {
          break_duration_mins?: number
          completed_pomodoros?: number
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          subject?: string | null
          total_focus_mins?: number
          user_id: string
          work_duration_mins?: number
        }
        Update: {
          break_duration_mins?: number
          completed_pomodoros?: number
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          subject?: string | null
          total_focus_mins?: number
          user_id?: string
          work_duration_mins?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepted_at: string | null
          avatar_url: string | null
          avg_attention_span_mins: number
          cognitive_fatigue_index: number
          consistency_score: number
          created_at: string
          department_id: string | null
          email: string | null
          full_name: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          is_independent: boolean
          leaderboard_visibility: string
          learning_velocity: number
          level: number
          motivation_driver: string
          name: string | null
          org_id: string | null
          peak_hours: string
          preferred_learning_style: string
          profile_highlights: Json | null
          rank: string
          role: string
          status: string
          streak: number
          streak_protections: number
          total_xp: number
          unlocked_modes: Json | null
          updated_at: string
          user_id: string
          xp: number
          xp_multiplier: number
        }
        Insert: {
          accepted_at?: string | null
          avatar_url?: string | null
          avg_attention_span_mins?: number
          cognitive_fatigue_index?: number
          consistency_score?: number
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_independent?: boolean
          leaderboard_visibility?: string
          learning_velocity?: number
          level?: number
          motivation_driver?: string
          name?: string | null
          org_id?: string | null
          peak_hours?: string
          preferred_learning_style?: string
          profile_highlights?: Json | null
          rank?: string
          role?: string
          status?: string
          streak?: number
          streak_protections?: number
          total_xp?: number
          unlocked_modes?: Json | null
          updated_at?: string
          user_id: string
          xp?: number
          xp_multiplier?: number
        }
        Update: {
          accepted_at?: string | null
          avatar_url?: string | null
          avg_attention_span_mins?: number
          cognitive_fatigue_index?: number
          consistency_score?: number
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_independent?: boolean
          leaderboard_visibility?: string
          learning_velocity?: number
          level?: number
          motivation_driver?: string
          name?: string | null
          org_id?: string | null
          peak_hours?: string
          preferred_learning_style?: string
          profile_highlights?: Json | null
          rank?: string
          role?: string
          status?: string
          streak?: number
          streak_protections?: number
          total_xp?: number
          unlocked_modes?: Json | null
          updated_at?: string
          user_id?: string
          xp?: number
          xp_multiplier?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      question_attempts: {
        Row: {
          attempt_number: number
          created_at: string
          difficulty_level: string
          id: string
          is_correct: boolean
          question_text: string
          quiz_id: string
          time_taken_seconds: number
          todo_id: string
          topic_id: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          attempt_number?: number
          created_at?: string
          difficulty_level?: string
          id?: string
          is_correct: boolean
          question_text: string
          quiz_id: string
          time_taken_seconds?: number
          todo_id: string
          topic_id?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          attempt_number?: number
          created_at?: string
          difficulty_level?: string
          id?: string
          is_correct?: boolean
          question_text?: string
          quiz_id?: string
          time_taken_seconds?: number
          todo_id?: string
          topic_id?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_attempts_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_attempts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_results: {
        Row: {
          answers: Json
          correct_answers: number
          created_at: string
          difficulty: string | null
          id: string
          previous_score: number | null
          score: number
          time_taken_seconds: number | null
          todo_id: string
          topic_id: string | null
          total_questions: number
          user_id: string
        }
        Insert: {
          answers?: Json
          correct_answers: number
          created_at?: string
          difficulty?: string | null
          id?: string
          previous_score?: number | null
          score: number
          time_taken_seconds?: number | null
          todo_id: string
          topic_id?: string | null
          total_questions: number
          user_id: string
        }
        Update: {
          answers?: Json
          correct_answers?: number
          created_at?: string
          difficulty?: string | null
          id?: string
          previous_score?: number | null
          score?: number
          time_taken_seconds?: number | null
          todo_id?: string
          topic_id?: string | null
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          id: string
          questions: Json
          todo_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          questions?: Json
          todo_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          questions?: Json
          todo_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_logs: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          operation: string
          success: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          operation: string
          success?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          operation?: string
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      recommendation_queue: {
        Row: {
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_completed: boolean
          is_dismissed: boolean
          priority: number
          recommendation_type: string
          title: string
          todo_id: string | null
          topic_id: string
          user_id: string
          video_channel: string | null
          video_id: string | null
          video_title: string | null
          weakness_score: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_completed?: boolean
          is_dismissed?: boolean
          priority?: number
          recommendation_type: string
          title: string
          todo_id?: string | null
          topic_id: string
          user_id: string
          video_channel?: string | null
          video_id?: string | null
          video_title?: string | null
          weakness_score?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_completed?: boolean
          is_dismissed?: boolean
          priority?: number
          recommendation_type?: string
          title?: string
          todo_id?: string | null
          topic_id?: string
          user_id?: string
          video_channel?: string | null
          video_id?: string | null
          video_title?: string | null
          weakness_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_queue_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_queue_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          permission: string
          role_id: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          id?: string
          permission: string
          role_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          permission?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_reminders: {
        Row: {
          created_at: string
          days_of_week: number[]
          id: string
          is_enabled: boolean
          message: string | null
          reminder_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_of_week?: number[]
          id?: string
          is_enabled?: boolean
          message?: string | null
          reminder_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[]
          id?: string
          is_enabled?: boolean
          message?: string | null
          reminder_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          ai_score: number | null
          attempt_number: number
          body: Json
          content_id: string
          final_score: number | null
          graded_at: string | null
          id: string
          override_by: string | null
          override_reason: string | null
          regrade_reason: string | null
          regrade_requested: boolean
          score_overridden: boolean
          status: string
          submitted_at: string
          teacher_score: number | null
          user_id: string
        }
        Insert: {
          ai_score?: number | null
          attempt_number?: number
          body?: Json
          content_id: string
          final_score?: number | null
          graded_at?: string | null
          id?: string
          override_by?: string | null
          override_reason?: string | null
          regrade_reason?: string | null
          regrade_requested?: boolean
          score_overridden?: boolean
          status?: string
          submitted_at?: string
          teacher_score?: number | null
          user_id: string
        }
        Update: {
          ai_score?: number | null
          attempt_number?: number
          body?: Json
          content_id?: string
          final_score?: number | null
          graded_at?: string | null
          id?: string
          override_by?: string | null
          override_reason?: string | null
          regrade_reason?: string | null
          regrade_requested?: boolean
          score_overridden?: boolean
          status?: string
          submitted_at?: string
          teacher_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_override_by_fkey"
            columns: ["override_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subtask_videos: {
        Row: {
          channel: string
          created_at: string
          engagement_score: number | null
          id: string
          order_index: number
          reason: string | null
          subtask_id: string
          title: string
          user_id: string
          video_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          engagement_score?: number | null
          id?: string
          order_index?: number
          reason?: string | null
          subtask_id: string
          title: string
          user_id: string
          video_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          engagement_score?: number | null
          id?: string
          order_index?: number
          reason?: string | null
          subtask_id?: string
          title?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtask_videos_subtask_id_fkey"
            columns: ["subtask_id"]
            isOneToOne: false
            referencedRelation: "subtasks"
            referencedColumns: ["id"]
          },
        ]
      }
      subtasks: {
        Row: {
          created_at: string
          id: string
          order_index: number
          title: string
          todo_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          title: string
          todo_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          title?: string
          todo_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          completed: boolean
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
          video_id: string | null
          video_url: string | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
          video_id?: string | null
          video_url?: string | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
          video_id?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      topic_mastery: {
        Row: {
          average_score: number
          best_score: number
          created_at: string
          fastest_completion: number | null
          high_score_streak: number
          id: string
          quizzes_completed: number
          topic_id: string
          total_correct: number
          total_questions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          average_score?: number
          best_score?: number
          created_at?: string
          fastest_completion?: number | null
          high_score_streak?: number
          id?: string
          quizzes_completed?: number
          topic_id: string
          total_correct?: number
          total_questions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          average_score?: number
          best_score?: number
          created_at?: string
          fastest_completion?: number | null
          high_score_streak?: number
          id?: string
          quizzes_completed?: number
          topic_id?: string
          total_correct?: number
          total_questions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_mastery_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          progress: number
          progress_max: number
          reward_claimed: boolean
          reward_expires_at: string | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          progress?: number
          progress_max?: number
          reward_claimed?: boolean
          reward_expires_at?: string | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          progress?: number
          progress_max?: number
          reward_claimed?: boolean
          reward_expires_at?: string | null
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_concept_states: {
        Row: {
          concept_id: string
          confused_with: string[]
          exposure_count: number
          forgetting_rate: number
          id: string
          last_reviewed: string | null
          mastery_score: number
          next_review_due: string | null
          user_id: string
          weakness_flag: boolean
        }
        Insert: {
          concept_id: string
          confused_with?: string[]
          exposure_count?: number
          forgetting_rate?: number
          id?: string
          last_reviewed?: string | null
          mastery_score?: number
          next_review_due?: string | null
          user_id: string
          weakness_flag?: boolean
        }
        Update: {
          concept_id?: string
          confused_with?: string[]
          exposure_count?: number
          forgetting_rate?: number
          id?: string
          last_reviewed?: string | null
          mastery_score?: number
          next_review_due?: string | null
          user_id?: string
          weakness_flag?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_concept_states_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "learning_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_concept_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          created_at: string
          credits_remaining: number
          credits_used: number
          id: string
          last_reset_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_remaining?: number
          credits_used?: number
          id?: string
          last_reset_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_remaining?: number
          credits_used?: number
          id?: string
          last_reset_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_daily_challenges: {
        Row: {
          challenge_date: string
          challenge_id: string
          completed_at: string | null
          created_at: string
          current_value: number
          expires_at: string
          id: string
          is_completed: boolean
          target_value: number
          updated_at: string
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          challenge_date?: string
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          current_value?: number
          expires_at: string
          id?: string
          is_completed?: boolean
          target_value: number
          updated_at?: string
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          challenge_date?: string
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          current_value?: number
          expires_at?: string
          id?: string
          is_completed?: boolean
          target_value?: number
          updated_at?: string
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_rewards: {
        Row: {
          achievement_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          reward_type: string
          reward_value: Json
          updated_at: string
          user_id: string
          uses_remaining: number | null
        }
        Insert: {
          achievement_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reward_type: string
          reward_value: Json
          updated_at?: string
          user_id: string
          uses_remaining?: number | null
        }
        Update: {
          achievement_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reward_type?: string
          reward_value?: Json
          updated_at?: string
          user_id?: string
          uses_remaining?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_rewards_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_topic_performance: {
        Row: {
          avg_time_seconds: number
          correct_answers: number
          created_at: string
          id: string
          last_updated: string
          repeated_mistakes: number
          strength_status: string
          topic_id: string
          total_questions: number
          total_time_seconds: number
          user_id: string
          weakness_score: number
          wrong_on_easy: number
          wrong_on_hard: number
          wrong_on_medium: number
        }
        Insert: {
          avg_time_seconds?: number
          correct_answers?: number
          created_at?: string
          id?: string
          last_updated?: string
          repeated_mistakes?: number
          strength_status?: string
          topic_id: string
          total_questions?: number
          total_time_seconds?: number
          user_id: string
          weakness_score?: number
          wrong_on_easy?: number
          wrong_on_hard?: number
          wrong_on_medium?: number
        }
        Update: {
          avg_time_seconds?: number
          correct_answers?: number
          created_at?: string
          id?: string
          last_updated?: string
          repeated_mistakes?: number
          strength_status?: string
          topic_id?: string
          total_questions?: number
          total_time_seconds?: number
          user_id?: string
          weakness_score?: number
          wrong_on_easy?: number
          wrong_on_hard?: number
          wrong_on_medium?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_topic_performance_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      video_cache: {
        Row: {
          channel: string
          created_at: string
          duration: string | null
          expires_at: string
          filters: Json
          id: string
          quality_scores: Json
          recommended_grade: string | null
          search_key: string
          strengths: Json | null
          subtasks_data: Json | null
          summary: string | null
          thumbnail: string | null
          title: string
          topic: string
          video_id: string
          weaknesses: Json | null
        }
        Insert: {
          channel: string
          created_at?: string
          duration?: string | null
          expires_at?: string
          filters?: Json
          id?: string
          quality_scores?: Json
          recommended_grade?: string | null
          search_key: string
          strengths?: Json | null
          subtasks_data?: Json | null
          summary?: string | null
          thumbnail?: string | null
          title: string
          topic: string
          video_id: string
          weaknesses?: Json | null
        }
        Update: {
          channel?: string
          created_at?: string
          duration?: string | null
          expires_at?: string
          filters?: Json
          id?: string
          quality_scores?: Json
          recommended_grade?: string | null
          search_key?: string
          strengths?: Json | null
          subtasks_data?: Json | null
          summary?: string | null
          thumbnail?: string | null
          title?: string
          topic?: string
          video_id?: string
          weaknesses?: Json | null
        }
        Relationships: []
      }
      video_progress: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          last_position_seconds: number
          progress_percent: number
          todo_id: string
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          last_position_seconds?: number
          progress_percent?: number
          todo_id: string
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          last_position_seconds?: number
          progress_percent?: number
          todo_id?: string
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_progress_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_topic_analysis: {
        Row: {
          correct_count: number
          created_at: string
          id: string
          is_weak_topic: boolean
          mastery_score: number
          questions_count: number
          todo_id: string
          topic_id: string
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          correct_count?: number
          created_at?: string
          id?: string
          is_weak_topic?: boolean
          mastery_score?: number
          questions_count?: number
          todo_id: string
          topic_id: string
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          correct_count?: number
          created_at?: string
          id?: string
          is_weak_topic?: boolean
          mastery_score?: number
          questions_count?: number
          todo_id?: string
          topic_id?: string
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_topic_analysis_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_topic_analysis_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      warnings: {
        Row: {
          classroom_id: string | null
          created_at: string
          flagged_by: string
          id: string
          notes: string | null
          reason: string
          resolved: boolean
          student_id: string
        }
        Insert: {
          classroom_id?: string | null
          created_at?: string
          flagged_by: string
          id?: string
          notes?: string | null
          reason: string
          resolved?: boolean
          student_id: string
        }
        Update: {
          classroom_id?: string | null
          created_at?: string
          flagged_by?: string
          id?: string
          notes?: string | null
          reason?: string
          resolved?: boolean
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warnings_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warnings_flagged_by_fkey"
            columns: ["flagged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warnings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_goal_streaks: {
        Row: {
          created_at: string | null
          current_week_streak: number | null
          id: string
          last_completed_week: string | null
          longest_week_streak: number | null
          total_weeks_completed: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_week_streak?: number | null
          id?: string
          last_completed_week?: string | null
          longest_week_streak?: number | null
          total_weeks_completed?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_week_streak?: number | null
          id?: string
          last_completed_week?: string | null
          longest_week_streak?: number | null
          total_weeks_completed?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weekly_study_goals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_value: number | null
          goal_type: string
          id: string
          is_completed: boolean | null
          target_value: number
          updated_at: string | null
          user_id: string
          week_start: string
          xp_reward: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          goal_type: string
          id?: string
          is_completed?: boolean | null
          target_value: number
          updated_at?: string | null
          user_id: string
          week_start: string
          xp_reward?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          goal_type?: string
          id?: string
          is_completed?: boolean | null
          target_value?: number
          updated_at?: string | null
          user_id?: string
          week_start?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_streak_protection: {
        Args: { p_amount?: number; p_user_id: string }
        Returns: boolean
      }
      assign_daily_challenges: {
        Args: { p_user_id: string }
        Returns: {
          challenge_date: string
          challenge_id: string
          completed_at: string | null
          created_at: string
          current_value: number
          expires_at: string
          id: string
          is_completed: boolean
          target_value: number
          updated_at: string
          user_id: string
          xp_earned: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "user_daily_challenges"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      check_achievements: {
        Args: { uid: string }
        Returns: {
          achievement_id: string
          achievement_name: string
          just_unlocked: boolean
        }[]
      }
      check_achievements_v2: {
        Args: { uid: string }
        Returns: {
          achievement_id: string
          achievement_name: string
          category: string
          just_unlocked: boolean
          progress: number
          progress_max: number
          reward_type: string
          reward_value: Json
          tier: string
        }[]
      }
      check_and_reset_credits: {
        Args: { uid: string }
        Returns: {
          credits_remaining: number
          credits_used: number
          was_reset: boolean
        }[]
      }
      consume_credits: {
        Args: { amount?: number; uid: string }
        Returns: boolean
      }
      generate_org_invite_code: { Args: never; Returns: string }
      get_profile_id: { Args: { uid: string }; Returns: string }
      get_user_org_id: { Args: { uid: string }; Returns: string }
      get_user_role: { Args: { uid: string }; Returns: string }
      get_week_start: { Args: { d?: string }; Returns: string }
      join_org_by_code: {
        Args: { p_code: string; p_role?: string; p_user_id: string }
        Returns: Json
      }
      update_achievement_progress: {
        Args: {
          p_achievement_id: string
          p_current_value: number
          p_metadata?: Json
          p_target_value: number
          p_user_id: string
        }
        Returns: undefined
      }
      use_streak_protection: { Args: { p_user_id: string }; Returns: boolean }
      validate_org_code: { Args: { p_code: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
