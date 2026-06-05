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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          id: string
          object_id: string | null
          object_type: string | null
          summary: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          object_id?: string | null
          object_type?: string | null
          summary?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          object_id?: string | null
          object_type?: string | null
          summary?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      app_config: {
        Row: {
          admin_bootstrapped: boolean
          id: boolean
          updated_at: string
        }
        Insert: {
          admin_bootstrapped?: boolean
          id?: boolean
          updated_at?: string
        }
        Update: {
          admin_bootstrapped?: boolean
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      logement_units: {
        Row: {
          available: boolean
          created_at: string
          id: string
          label: string
          logement_id: string
          op_status: string
          sort_order: number
          unit_number: number
          updated_at: string
        }
        Insert: {
          available?: boolean
          created_at?: string
          id?: string
          label: string
          logement_id: string
          op_status?: string
          sort_order?: number
          unit_number?: number
          updated_at?: string
        }
        Update: {
          available?: boolean
          created_at?: string
          id?: string
          label?: string
          logement_id?: string
          op_status?: string
          sort_order?: number
          unit_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "logement_units_logement_id_fkey"
            columns: ["logement_id"]
            isOneToOne: false
            referencedRelation: "logements"
            referencedColumns: ["id"]
          },
        ]
      }
      logements: {
        Row: {
          available: boolean
          created_at: string
          currency: string
          description_de: string | null
          description_en: string | null
          description_fr: string | null
          equipments: string[]
          id: string
          images: string[]
          price: number
          price_unit: string
          sort_order: number
          title_de: string | null
          title_en: string | null
          title_fr: string
          type: string
          updated_at: string
        }
        Insert: {
          available?: boolean
          created_at?: string
          currency?: string
          description_de?: string | null
          description_en?: string | null
          description_fr?: string | null
          equipments?: string[]
          id?: string
          images?: string[]
          price?: number
          price_unit?: string
          sort_order?: number
          title_de?: string | null
          title_en?: string | null
          title_fr: string
          type?: string
          updated_at?: string
        }
        Update: {
          available?: boolean
          created_at?: string
          currency?: string
          description_de?: string | null
          description_en?: string | null
          description_fr?: string | null
          equipments?: string[]
          id?: string
          images?: string[]
          price?: number
          price_unit?: string
          sort_order?: number
          title_de?: string | null
          title_en?: string | null
          title_fr?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string
          name: string
          phone: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          note: string | null
          recorded_by: string | null
          recorded_by_name: string | null
          reservation_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string
          note?: string | null
          recorded_by?: string | null
          recorded_by_name?: string | null
          reservation_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          note?: string | null
          recorded_by?: string | null
          recorded_by_name?: string | null
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone_number: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone_number?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          advance_amount: number
          arrival_date: string
          arrival_time: string
          channel: string
          checkin_at: string | null
          checkout_at: string | null
          created_at: string
          departure_date: string
          departure_time: string
          email: string | null
          guests: number
          id: string
          logement_type: string | null
          logement_unit_id: string | null
          message: string | null
          name: string
          notes: string | null
          payment_status: string
          phone: string
          status: string
          total_amount: number
          user_id: string | null
        }
        Insert: {
          advance_amount?: number
          arrival_date: string
          arrival_time?: string
          channel?: string
          checkin_at?: string | null
          checkout_at?: string | null
          created_at?: string
          departure_date: string
          departure_time?: string
          email?: string | null
          guests?: number
          id?: string
          logement_type?: string | null
          logement_unit_id?: string | null
          message?: string | null
          name: string
          notes?: string | null
          payment_status?: string
          phone: string
          status?: string
          total_amount?: number
          user_id?: string | null
        }
        Update: {
          advance_amount?: number
          arrival_date?: string
          arrival_time?: string
          channel?: string
          checkin_at?: string | null
          checkout_at?: string | null
          created_at?: string
          departure_date?: string
          departure_time?: string
          email?: string | null
          guests?: number
          id?: string
          logement_type?: string | null
          logement_unit_id?: string | null
          message?: string | null
          name?: string
          notes?: string | null
          payment_status?: string
          phone?: string
          status?: string
          total_amount?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_logement_unit_id_fkey"
            columns: ["logement_unit_id"]
            isOneToOne: false
            referencedRelation: "logement_units"
            referencedColumns: ["id"]
          },
        ]
      }
      residence_settings: {
        Row: {
          cancellation_policy: string | null
          checkin_time: string
          checkout_time: string
          currency: string
          deposit_percent: number
          email_notifications: boolean
          id: boolean
          language: string
          logo_url: string | null
          name: string
          taxes: string | null
          updated_at: string
        }
        Insert: {
          cancellation_policy?: string | null
          checkin_time?: string
          checkout_time?: string
          currency?: string
          deposit_percent?: number
          email_notifications?: boolean
          id?: boolean
          language?: string
          logo_url?: string | null
          name?: string
          taxes?: string | null
          updated_at?: string
        }
        Update: {
          cancellation_policy?: string | null
          checkin_time?: string
          checkout_time?: string
          currency?: string
          deposit_percent?: number
          email_notifications?: boolean
          id?: boolean
          language?: string
          logo_url?: string | null
          name?: string
          taxes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          created_at: string
          id: string
          location: string | null
          message_de: string | null
          message_en: string | null
          message_fr: string
          name: string
          rating: number
          sort_order: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          message_de?: string | null
          message_en?: string | null
          message_fr: string
          name: string
          rating?: number
          sort_order?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          message_de?: string | null
          message_en?: string | null
          message_fr?: string
          name?: string
          rating?: number
          sort_order?: number
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_admin: { Args: { _user_id: string }; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "proprietaire"
        | "gestionnaire"
        | "reception"
        | "menage"
        | "comptable"
        | "technicien"
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
    Enums: {
      app_role: [
        "admin",
        "user",
        "proprietaire",
        "gestionnaire",
        "reception",
        "menage",
        "comptable",
        "technicien",
      ],
    },
  },
} as const
