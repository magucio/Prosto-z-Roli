// Na podstawie typów wygenerowanych z bazy Supabase (projekt ojctjylqfcrdkcwzmfuo), 1.11.2026.
// Okrojone do tabel używanych przez klientów; Insert/Update odpowiadają kolumnom z GRANT dla roli authenticated.
// Pełna generacja (nadpisze ten plik): npx supabase gen types typescript --project-id ojctjylqfcrdkcwzmfuo > packages/shared/src/database.types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      abuse_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          listing_id: string | null
          message_id: string | null
          reason: string
          reported_user_id: string | null
          reporter_id: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string | null
          message_id?: string | null
          reason: string
          reported_user_id?: string | null
          reporter_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string | null
          message_id?: string | null
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: []
      }
      admin_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          role?: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          role?: Database["public"]["Enums"]["admin_role"]
          user_id?: string
        }
        Relationships: []
      }
      blocked_words: {
        Row: {
          action: Database["public"]["Enums"]["word_action"]
          applies_to_listings: boolean
          applies_to_messages: boolean
          created_at: string
          created_by: string | null
          id: string
          pattern: string
          updated_at: string
        }
        Insert: {
          action?: Database["public"]["Enums"]["word_action"]
          applies_to_listings?: boolean
          applies_to_messages?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          pattern: string
          updated_at?: string
        }
        Update: {
          action?: Database["public"]["Enums"]["word_action"]
          applies_to_listings?: boolean
          applies_to_messages?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          pattern?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["listing_kind"]
          name: string
          restriction_level: Database["public"]["Enums"]["restriction_level"]
          restriction_message: string | null
          slug: string
          sort: number
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          icon: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["listing_kind"]
          name: string
          restriction_level?: Database["public"]["Enums"]["restriction_level"]
          restriction_message?: string | null
          slug: string
          sort?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["listing_kind"]
          name?: string
          restriction_level?: Database["public"]["Enums"]["restriction_level"]
          restriction_message?: string | null
          slug?: string
          sort?: number
          updated_at?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          archived: boolean
          conversation_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          conversation_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          conversation_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string
          listing_id: string | null
          listing_title: string
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id?: string | null
          listing_title: string
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id?: string | null
          listing_title?: string
          seller_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_contact_settings: {
        Row: {
          allow_chat: boolean
          email: string | null
          listing_id: string
          phone: string | null
          share_email: boolean
          share_phone: boolean
          updated_at: string
        }
        Insert: {
          allow_chat?: boolean
          email?: string | null
          listing_id: string
          phone?: string | null
          share_email?: boolean
          share_phone?: boolean
          updated_at?: string
        }
        Update: {
          allow_chat?: boolean
          email?: string | null
          listing_id?: string
          phone?: string | null
          share_email?: boolean
          share_phone?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      listing_images: {
        Row: {
          created_at: string
          exif_checked: boolean
          height: number | null
          id: string
          is_main: boolean
          listing_id: string
          sort: number
          storage_path: string
          width: number | null
        }
        Insert: {
          created_at?: string
          exif_checked?: boolean
          height?: number | null
          id?: string
          is_main?: boolean
          listing_id: string
          sort?: number
          storage_path: string
          width?: number | null
        }
        Update: {
          created_at?: string
          exif_checked?: boolean
          height?: number | null
          id?: string
          is_main?: boolean
          listing_id?: string
          sort?: number
          storage_path?: string
          width?: number | null
        }
        Relationships: []
      }
      listing_products: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          id: string
          image_path: string | null
          is_available: boolean
          listing_id: string
          price: number | null
          price_type: Database["public"]["Enums"]["price_type"]
          product_id: string
          quantity: number | null
          sort: number
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_path?: string | null
          is_available?: boolean
          listing_id: string
          price?: number | null
          price_type?: Database["public"]["Enums"]["price_type"]
          product_id: string
          quantity?: number | null
          sort?: number
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_path?: string | null
          is_available?: boolean
          listing_id?: string
          price?: number | null
          price_type?: Database["public"]["Enums"]["price_type"]
          product_id?: string
          quantity?: number | null
          sort?: number
          unit_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      listings: {
        Row: {
          address_text: string | null
          confirmed_at: string | null
          created_at: string
          delivery_available: boolean
          description: string
          expires_at: string | null
          id: string
          listing_kind: Database["public"]["Enums"]["listing_kind"]
          location_exact: unknown
          location_public: unknown
          main_category_id: string
          owner_id: string
          pickup_available: boolean
          place_id: number | null
          place_name: string | null
          published_at: string | null
          seller_name: string
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
        }
        Insert: {
          address_text?: string | null
          place_name?: string | null
          description?: string
          listing_kind?: Database["public"]["Enums"]["listing_kind"]
          location_exact: unknown
          main_category_id: string
          pickup_available?: boolean
          seller_name: string
          title: string
        }
        Update: {
          address_text?: string | null
          place_name?: string | null
          description?: string
          location_exact?: unknown
          main_category_id?: string
          pickup_available?: boolean
          seller_name?: string
          title?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
        }
        Update: {
          body?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json
          expires_at: string | null
          id: string
          kind: string
          listing_id: string | null
          read_at: string | null
          sent_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          kind: string
          title: string
          user_id: string
        }
        Update: {
          read_at?: string | null
        }
        Relationships: []
      }
      product_catalog: {
        Row: {
          category_id: string
          created_at: string
          default_unit_id: string | null
          id: string
          is_active: boolean
          name: string
          search_text: string
          sort: number
          synonyms: string[]
          updated_at: string
        }
        Insert: {
          category_id: string
          default_unit_id?: string | null
          is_active?: boolean
          name: string
          sort?: number
          synonyms?: string[]
        }
        Update: {
          category_id?: string
          default_unit_id?: string | null
          is_active?: boolean
          name?: string
          sort?: number
          synonyms?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "product_catalog_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_catalog_default_unit_id_fkey"
            columns: ["default_unit_id"]
            isOneToOne: false
            referencedRelation: "product_units"
            referencedColumns: ["id"]
          },
        ]
      }
      product_units: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["listing_kind"]
          name: string
          short_name: string
          sort: number
          updated_at: string
        }
        Insert: {
          code: string
          kind?: Database["public"]["Enums"]["listing_kind"]
          name: string
          short_name: string
          sort?: number
        }
        Update: {
          code?: string
          kind?: Database["public"]["Enums"]["listing_kind"]
          name?: string
          short_name?: string
          sort?: number
          is_active?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          display_name: string
          id: string
          seller_type: Database["public"]["Enums"]["seller_type"]
        }
        Insert: {
          display_name: string
          id: string
        }
        Update: {
          avatar_path?: string | null
          display_name?: string
          seller_type?: Database["public"]["Enums"]["seller_type"]
        }
        Relationships: []
      }
      seller_profiles: {
        Row: {
          address_line: string | null
          city: string | null
          company_name: string | null
          created_at: string
          farm_name: string | null
          nip: string | null
          postal_code: string | null
          regon: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line?: string | null
          city?: string | null
          company_name?: string | null
          farm_name?: string | null
          nip?: string | null
          postal_code?: string | null
          regon?: string | null
          user_id: string
        }
        Update: {
          address_line?: string | null
          city?: string | null
          company_name?: string | null
          farm_name?: string | null
          nip?: string | null
          postal_code?: string | null
          regon?: string | null
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
        }
        Update: never
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_block_user: {
        Args: { p_reason: string; p_until: string | null; p_user_id: string }
        Returns: undefined
      }
      admin_pending_listings: { Args: { p_limit?: number }; Returns: Json }
      admin_reports: { Args: { p_limit?: number; p_status?: string }; Returns: Json }
      admin_resolve_report: {
        Args: { p_id: string; p_note: string; p_status: string }
        Returns: undefined
      }
      admin_set_listing_status: {
        Args: {
          p_id: string
          p_reason: string
          p_status: Database["public"]["Enums"]["listing_status"]
        }
        Returns: undefined
      }
      admin_stats: { Args: never; Returns: Json }
      admin_unblock_user: { Args: { p_reason: string; p_user_id: string }; Returns: undefined }
      confirm_listing: { Args: { p_id: string }; Returns: string }
      listing_detail: { Args: { p_id: string }; Returns: Json }
      map_points: {
        Args: {
          p_category_ids?: string[]
          p_east: number
          p_kind?: Database["public"]["Enums"]["listing_kind"]
          p_north: number
          p_price_max?: number
          p_price_min?: number
          p_product_ids?: string[]
          p_seller_types?: Database["public"]["Enums"]["seller_type"][]
          p_south: number
          p_west: number
          p_zoom: number
        }
        Returns: {
          color: string | null
          icon: string | null
          id: string | null
          is_cluster: boolean
          lat: number
          lng: number
          point_count: number
          title: string | null
        }[]
      }
      mark_conversation_read: { Args: { p_conversation_id: string }; Returns: undefined }
      my_account: { Args: never; Returns: Json }
      my_admin_role: { Args: never; Returns: Database["public"]["Enums"]["admin_role"] | null }
      my_conversations: { Args: never; Returns: Json }
      my_listing: { Args: { p_id: string }; Returns: Json }
      my_listings: { Args: never; Returns: Json }
      pause_listing: { Args: { p_id: string }; Returns: undefined }
      publish_listing: {
        Args: { p_id: string }
        Returns: Database["public"]["Enums"]["listing_status"]
      }
      register_push_token: { Args: { p_platform: string; p_token: string }; Returns: undefined }
      remove_listing: { Args: { p_id: string }; Returns: undefined }
      replace_listing_images: { Args: { p_images: Json; p_listing_id: string }; Returns: number }
      replace_listing_items: { Args: { p_items: Json; p_listing_id: string }; Returns: number }
      report_content: {
        Args: { p_details?: string; p_reason: string; p_target_id: string; p_target_type: string }
        Returns: string
      }
      reveal_contact: { Args: { p_field: string; p_listing_id: string }; Returns: string }
      start_conversation: { Args: { p_body: string; p_listing_id: string }; Returns: string }
      unread_messages_count: { Args: never; Returns: number }
    }
    Enums: {
      admin_role: "moderator" | "admin" | "superadmin"
      listing_kind: "product" | "service"
      listing_status:
        | "draft"
        | "pending_review"
        | "active"
        | "paused"
        | "expired"
        | "removed"
        | "blocked"
      price_type: "fixed" | "negotiable"
      restriction_level: "none" | "analysis_pending" | "blocked"
      seller_type: "private" | "farm" | "company"
      word_action: "reject" | "review"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
