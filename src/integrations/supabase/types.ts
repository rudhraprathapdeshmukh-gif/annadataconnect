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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      food_donations: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          diet_type: string | null
          donor_id: string
          expiry_date: string | null
          food_type: string
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          otp: string | null
          phone_number: string | null
          pickup_location: string
          quantity: string
          quantity_unit: string
          rating: number | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          diet_type?: string | null
          donor_id: string
          expiry_date?: string | null
          food_type: string
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          otp?: string | null
          phone_number?: string | null
          pickup_location: string
          quantity: string
          quantity_unit?: string
          rating?: number | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          diet_type?: string | null
          donor_id?: string
          expiry_date?: string | null
          food_type?: string
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          otp?: string | null
          phone_number?: string | null
          pickup_location?: string
          quantity?: string
          quantity_unit?: string
          rating?: number | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_donations_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      food_requests: {
        Row: {
          accepted_at: string | null
          actual_pickup_at: string | null
          arrival_confirmed_at: string | null
          created_at: string
          donation_id: string
          donor_rating: number | null
          donor_review: string | null
          estimated_travel_time: number | null
          extension_count: number | null
          extension_granted: boolean | null
          extension_requested_at: string | null
          id: string
          message: string | null
          no_show: boolean | null
          receiver_rating: number | null
          receiver_review: string | null
          requester_id: string
          status: string | null
          timer_duration: number | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          actual_pickup_at?: string | null
          arrival_confirmed_at?: string | null
          created_at?: string
          donation_id: string
          donor_rating?: number | null
          donor_review?: string | null
          estimated_travel_time?: number | null
          extension_count?: number | null
          extension_granted?: boolean | null
          extension_requested_at?: string | null
          id?: string
          message?: string | null
          no_show?: boolean | null
          receiver_rating?: number | null
          receiver_review?: string | null
          requester_id: string
          status?: string | null
          timer_duration?: number | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          actual_pickup_at?: string | null
          arrival_confirmed_at?: string | null
          created_at?: string
          donation_id?: string
          donor_rating?: number | null
          donor_review?: string | null
          estimated_travel_time?: number | null
          extension_count?: number | null
          extension_granted?: boolean | null
          extension_requested_at?: string | null
          id?: string
          message?: string | null
          no_show?: boolean | null
          receiver_rating?: number | null
          receiver_review?: string | null
          requester_id?: string
          status?: string | null
          timer_duration?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_requests_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "food_donations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          donation_id: string
          id: string
          latitude: number | null
          location_name: string | null
          longitude: number | null
          message: string
          message_type: string
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          donation_id: string
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          message: string
          message_type?: string
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          donation_id?: string
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          message?: string
          message_type?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "food_donations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          average_pickup_time: number | null
          created_at: string
          district: string | null
          email: string | null
          first_name: string | null
          id: string
          language: string | null
          last_name: string | null
          latitude: number | null
          longitude: number | null
          no_show_count: number | null
          notification_email: boolean | null
          notification_push: boolean | null
          notification_sms: boolean | null
          on_time_count: number | null
          phone_number: string | null
          reliability_score: number | null
          suspended_until: string | null
          total_pickups: number | null
          updated_at: string
          user_type: string | null
        }
        Insert: {
          avatar_url?: string | null
          average_pickup_time?: number | null
          created_at?: string
          district?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          language?: string | null
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          no_show_count?: number | null
          notification_email?: boolean | null
          notification_push?: boolean | null
          notification_sms?: boolean | null
          on_time_count?: number | null
          phone_number?: string | null
          reliability_score?: number | null
          suspended_until?: string | null
          total_pickups?: number | null
          updated_at?: string
          user_type?: string | null
        }
        Update: {
          avatar_url?: string | null
          average_pickup_time?: number | null
          created_at?: string
          district?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          language?: string | null
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          no_show_count?: number | null
          notification_email?: boolean | null
          notification_push?: boolean | null
          notification_sms?: boolean | null
          on_time_count?: number | null
          phone_number?: string | null
          reliability_score?: number | null
          suspended_until?: string | null
          total_pickups?: number | null
          updated_at?: string
          user_type?: string | null
        }
        Relationships: []
      }
      saved_addresses: {
        Row: {
          address_name: string
          area: string
          city: string
          complete_address: string
          created_at: string | null
          id: string
          is_default: boolean | null
          latitude: number | null
          longitude: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address_name: string
          area: string
          city: string
          complete_address: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          latitude?: number | null
          longitude?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address_name?: string
          area?: string
          city?: string
          complete_address?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          latitude?: number | null
          longitude?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_expire_donations: { Args: never; Returns: undefined }
      get_district_donations: {
        Args: { p_district: string }
        Returns: {
          approx_latitude: number
          approx_longitude: number
          created_at: string
          description: string
          diet_type: string
          expiry_date: string
          food_type: string
          id: string
          image_url: string
          masked_location: string
          quantity: string
          quantity_unit: string
          rating: number
          status: string
          title: string
        }[]
      }
      get_nearby_donations: {
        Args: { p_lat: number; p_lng: number; p_radius_km?: number }
        Returns: {
          approx_latitude: number
          approx_longitude: number
          created_at: string
          description: string
          diet_type: string
          distance_km: number
          expiry_date: string
          food_type: string
          id: string
          image_url: string
          map_latitude: number
          map_longitude: number
          masked_location: string
          quantity: string
          quantity_unit: string
          rating: number
          status: string
          title: string
        }[]
      }
      get_public_donations: {
        Args: never
        Returns: {
          approx_latitude: number
          approx_longitude: number
          created_at: string
          description: string
          diet_type: string
          expiry_date: string
          food_type: string
          id: string
          image_url: string
          masked_location: string
          quantity: string
          quantity_unit: string
          rating: number
          status: string
          title: string
        }[]
      }
      get_receiver_donation_ids: {
        Args: { receiver_id: string }
        Returns: {
          donation_id: string
        }[]
      }
      get_receiver_donor_ids: {
        Args: { receiver_id: string }
        Returns: {
          donor_id: string
        }[]
      }
      get_user_display_name: { Args: { user_id: string }; Returns: string }
      has_active_approved_request: {
        Args: { _donation_id: string }
        Returns: boolean
      }
      has_completed_request: {
        Args: { _donation_id: string }
        Returns: boolean
      }
      insert_user_location: {
        Args: { p_lat: number; p_lng: number; p_user_id: string }
        Returns: undefined
      }
      is_donation_claimed: { Args: { _donation_id: string }; Returns: boolean }
      soft_delete_donation: {
        Args: { _donation_id: string }
        Returns: undefined
      }
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
