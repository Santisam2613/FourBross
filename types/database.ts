export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string;
          code: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          created_at?: string;
        };
      };
      branches: {
        Row: {
          id: string;
          name: string;
          city: string;
          address: string;
          phone: string | null;
          timezone: string;
          lat: number | null;
          lng: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          city: string;
          address: string;
          phone?: string | null;
          timezone?: string;
          lat?: number | null;
          lng?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          city?: string;
          address?: string;
          phone?: string | null;
          timezone?: string;
          lat?: number | null;
          lng?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      users: {
        Row: {
          id: string;
          email: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          role: string;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          selected_branch_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          role?: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          selected_branch_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          role?: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          selected_branch_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      staff_branches: {
        Row: {
          id: string;
          staff_id: string;
          branch_id: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          branch_id: string;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          staff_id?: string;
          branch_id?: string;
          is_primary?: boolean;
          created_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          branch_id: string;
          name: string;
          description: string | null;
          duration_minutes: number;
          price_cents: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          branch_id: string;
          name: string;
          description?: string | null;
          duration_minutes?: number;
          price_cents?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          branch_id?: string;
          name?: string;
          description?: string | null;
          duration_minutes?: number;
          price_cents?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      products: {
        Row: {
          id: string;
          branch_id: string;
          name: string;
          sku: string | null;
          description: string | null;
          price_cents: number;
          cost_cents: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          branch_id: string;
          name: string;
          sku?: string | null;
          description?: string | null;
          price_cents?: number;
          cost_cents?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          branch_id?: string;
          name?: string;
          sku?: string | null;
          description?: string | null;
          price_cents?: number;
          cost_cents?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      inventory: {
        Row: {
          id: string;
          branch_id: string;
          product_id: string;
          quantity: number;
          low_stock_threshold: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          branch_id: string;
          product_id: string;
          quantity?: number;
          low_stock_threshold?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          branch_id?: string;
          product_id?: string;
          quantity?: number;
          low_stock_threshold?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      orders: {
        Row: {
          id: string;
          client_id: string;
          branch_id: string;
          staff_id: string | null;
          appointment_start: string;
          appointment_end: string;
          status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
          cancelled_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          branch_id: string;
          staff_id?: string | null;
          appointment_start: string;
          appointment_end: string;
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
          notes?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
          cancelled_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          branch_id?: string;
          staff_id?: string | null;
          appointment_start?: string;
          appointment_end?: string;
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
          notes?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
          cancelled_at?: string | null;
          deleted_at?: string | null;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          item_type: 'service' | 'product';
          service_id: string | null;
          product_id: string | null;
          quantity: number;
          unit_price_cents: number;
          subtotal_cents: number;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          item_type: 'service' | 'product';
          service_id?: string | null;
          product_id?: string | null;
          quantity?: number;
          unit_price_cents?: number;
          subtotal_cents?: number;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          item_type?: 'service' | 'product';
          service_id?: string | null;
          product_id?: string | null;
          quantity?: number;
          unit_price_cents?: number;
          subtotal_cents?: number;
          created_at?: string;
          deleted_at?: string | null;
        };
      };
      appointments: {
        Row: {
          id: string;
          order_id: string;
          client_id: string;
          branch_id: string;
          staff_id: string | null;
          start_at: string;
          end_at: string;
          status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          client_id: string;
          branch_id: string;
          staff_id?: string | null;
          start_at: string;
          end_at: string;
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          client_id?: string;
          branch_id?: string;
          staff_id?: string | null;
          start_at?: string;
          end_at?: string;
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      loyalty_cards: {
        Row: {
          id: string;
          client_id: string;
          branch_id: string;
          points: number;
          stamps: number;
          tier: string;
          last_activity_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          branch_id: string;
          points?: number;
          stamps?: number;
          tier?: string;
          last_activity_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          branch_id?: string;
          points?: number;
          stamps?: number;
          tier?: string;
          last_activity_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      rewards: {
        Row: {
          id: string;
          branch_id: string;
          title: string;
          description: string | null;
          required_points: number;
          stock: number;
          starts_at: string | null;
          ends_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          branch_id: string;
          title: string;
          description?: string | null;
          required_points?: number;
          stock?: number;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          branch_id?: string;
          title?: string;
          description?: string | null;
          required_points?: number;
          stock?: number;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      reward_redemptions: {
        Row: {
          id: string;
          reward_id: string;
          client_id: string;
          order_id: string | null;
          points_spent: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          reward_id: string;
          client_id: string;
          order_id?: string | null;
          points_spent?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          reward_id?: string;
          client_id?: string;
          order_id?: string | null;
          points_spent?: number;
          created_at?: string;
        };
      };
      staff_availability: {
        Row: {
          id: string;
          staff_id: string;
          branch_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          staff_id: string;
          branch_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          staff_id?: string;
          branch_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      staff_wallet: {
        Row: {
          staff_id: string;
          balance_cents: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          staff_id: string;
          balance_cents?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          staff_id?: string;
          balance_cents?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      staff_wallet_entries: {
        Row: {
          id: string;
          staff_id: string;
          entry_type: 'earning' | 'payout' | 'adjustment';
          amount_cents: number;
          order_id: string | null;
          payout_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          entry_type: 'earning' | 'payout' | 'adjustment';
          amount_cents: number;
          order_id?: string | null;
          payout_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          staff_id?: string;
          entry_type?: 'earning' | 'payout' | 'adjustment';
          amount_cents?: number;
          order_id?: string | null;
          payout_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
      };
      payouts: {
        Row: {
          id: string;
          staff_id: string;
          amount_cents: number;
          status: 'requested' | 'approved' | 'paid' | 'rejected';
          requested_at: string;
          processed_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          staff_id: string;
          amount_cents: number;
          status?: 'requested' | 'approved' | 'paid' | 'rejected';
          requested_at?: string;
          processed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          staff_id?: string;
          amount_cents?: number;
          status?: 'requested' | 'approved' | 'paid' | 'rejected';
          requested_at?: string;
          processed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      expenses: {
        Row: {
          id: string;
          branch_id: string;
          amount_cents: number;
          category: string;
          description: string | null;
          expense_date: string;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          branch_id: string;
          amount_cents: number;
          category: string;
          description?: string | null;
          expense_date?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          branch_id?: string;
          amount_cents?: number;
          category?: string;
          description?: string | null;
          expense_date?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      partners: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          percentage_basis_points: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          percentage_basis_points?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          percentage_basis_points?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          channel: 'system' | 'push';
          title: string;
          body: string;
          data: Json;
          provider: string;
          status: 'pending' | 'sent' | 'failed';
          external_id: string | null;
          created_at: string;
          sent_at: string | null;
          read_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          channel?: 'system' | 'push';
          title: string;
          body: string;
          data?: Json;
          provider?: string;
          status?: 'pending' | 'sent' | 'failed';
          external_id?: string | null;
          created_at?: string;
          sent_at?: string | null;
          read_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          channel?: 'system' | 'push';
          title?: string;
          body?: string;
          data?: Json;
          provider?: string;
          status?: 'pending' | 'sent' | 'failed';
          external_id?: string | null;
          created_at?: string;
          sent_at?: string | null;
          read_at?: string | null;
          deleted_at?: string | null;
        };
      };
      testimonials: {
        Row: {
          id: string;
          author_name: string;
          quote: string;
          rating: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          author_name: string;
          quote: string;
          rating?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          author_name?: string;
          quote?: string;
          rating?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      benefits: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          icon: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          icon?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          icon?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_staff_available: {
        Args: {
          p_staff_id: string;
          p_branch_id: string;
          p_start_at: string;
          p_end_at: string;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
