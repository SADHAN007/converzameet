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
      billing_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      billing_client_projects: {
        Row: {
          billing_client_id: string
          created_at: string
          id: string
          project_id: string
        }
        Insert: {
          billing_client_id: string
          created_at?: string
          id?: string
          project_id: string
        }
        Update: {
          billing_client_id?: string
          created_at?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_client_projects_billing_client_id_fkey"
            columns: ["billing_client_id"]
            isOneToOne: false
            referencedRelation: "billing_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_client_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_clients: {
        Row: {
          billing_address: string | null
          billing_city: string | null
          billing_email: string | null
          billing_frequency: string | null
          billing_phone: string | null
          billing_state: string | null
          billing_zip: string | null
          client_name: string | null
          company_name: string | null
          created_at: string
          created_by: string | null
          gst_number: string | null
          id: string
          is_active: boolean
          notes: string | null
          pan_number: string | null
          profile_id: string | null
          secondary_contact: string | null
          updated_at: string
        }
        Insert: {
          billing_address?: string | null
          billing_city?: string | null
          billing_email?: string | null
          billing_frequency?: string | null
          billing_phone?: string | null
          billing_state?: string | null
          billing_zip?: string | null
          client_name?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          pan_number?: string | null
          profile_id?: string | null
          secondary_contact?: string | null
          updated_at?: string
        }
        Update: {
          billing_address?: string | null
          billing_city?: string | null
          billing_email?: string | null
          billing_frequency?: string | null
          billing_phone?: string | null
          billing_state?: string | null
          billing_zip?: string | null
          client_name?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          pan_number?: string | null
          profile_id?: string | null
          secondary_contact?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      call_requests: {
        Row: {
          caller_id: string
          created_at: string
          expires_at: string
          id: string
          meeting_id: string | null
          recipient_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          caller_id: string
          created_at?: string
          expires_at?: string
          id?: string
          meeting_id?: string | null
          recipient_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          caller_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          meeting_id?: string | null
          recipient_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_requests_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_groups: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_direct_message: boolean
          name: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_direct_message?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_direct_message?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          bank_account_number: string | null
          bank_branch: string | null
          bank_ifsc: string | null
          bank_name: string | null
          company_address: string | null
          company_city: string | null
          company_email: string | null
          company_name: string
          company_phone: string | null
          company_state: string | null
          company_zip: string | null
          gst_number: string | null
          id: string
          logo_url: string | null
          pan_number: string | null
          updated_at: string
          updated_by: string | null
          website: string | null
        }
        Insert: {
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          company_address?: string | null
          company_city?: string | null
          company_email?: string | null
          company_name?: string
          company_phone?: string | null
          company_state?: string | null
          company_zip?: string | null
          gst_number?: string | null
          id?: string
          logo_url?: string | null
          pan_number?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          company_address?: string | null
          company_city?: string | null
          company_email?: string | null
          company_name?: string
          company_phone?: string | null
          company_state?: string | null
          company_zip?: string | null
          gst_number?: string | null
          id?: string
          logo_url?: string | null
          pan_number?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Relationships: []
      }
      estimate_line_items: {
        Row: {
          created_at: string
          description: string | null
          discount: number
          estimate_id: string
          id: string
          line_total: number
          quantity: number
          service_name: string
          sort_order: number
          tax_percent: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount?: number
          estimate_id: string
          id?: string
          line_total?: number
          quantity?: number
          service_name: string
          sort_order?: number
          tax_percent?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          discount?: number
          estimate_id?: string
          id?: string
          line_total?: number
          quantity?: number
          service_name?: string
          sort_order?: number
          tax_percent?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimate_line_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          client_id: string
          created_at: string
          created_by: string | null
          discount_amount: number
          estimate_date: string
          estimate_number: string
          expiry_date: string | null
          grand_total: number
          id: string
          is_backdated: boolean
          notes: string | null
          rejection_reason: string | null
          scanned_pdf_url: string | null
          status: string
          subtotal: number
          tax_amount: number
          terms: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          estimate_date?: string
          estimate_number: string
          expiry_date?: string | null
          grand_total?: number
          id?: string
          is_backdated?: boolean
          notes?: string | null
          rejection_reason?: string | null
          scanned_pdf_url?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          terms?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          estimate_date?: string
          estimate_number?: string
          expiry_date?: string | null
          grand_total?: number
          id?: string
          is_backdated?: boolean
          notes?: string | null
          rejection_reason?: string | null
          scanned_pdf_url?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          terms?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "billing_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string | null
          created_at: string
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          group_id: string
          id: string
          is_edited: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          group_id: string
          id?: string
          is_edited?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          group_id?: string
          id?: string
          is_edited?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          created_at: string
          description: string | null
          discount: number
          id: string
          invoice_id: string
          line_total: number
          quantity: number
          service_name: string
          sort_order: number
          tax_percent: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount?: number
          id?: string
          invoice_id: string
          line_total?: number
          quantity?: number
          service_name: string
          sort_order?: number
          tax_percent?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          discount?: number
          id?: string
          invoice_id?: string
          line_total?: number
          quantity?: number
          service_name?: string
          sort_order?: number
          tax_percent?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          client_id: string
          created_at: string
          created_by: string | null
          discount_amount: number
          due_date: string | null
          estimate_id: string | null
          grand_total: number
          id: string
          invoice_date: string
          invoice_number: string
          is_backdated: boolean
          notes: string | null
          scanned_pdf_url: string | null
          status: string
          subtotal: number
          tax_amount: number
          terms: string | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          client_id: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          due_date?: string | null
          estimate_id?: string | null
          grand_total?: number
          id?: string
          invoice_date?: string
          invoice_number: string
          is_backdated?: boolean
          notes?: string | null
          scanned_pdf_url?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          terms?: string | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          due_date?: string | null
          estimate_id?: string | null
          grand_total?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          is_backdated?: boolean
          notes?: string | null
          scanned_pdf_url?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          terms?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "billing_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          lead_id: string
          new_value: string | null
          note: string | null
          old_value: string | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          lead_id: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          lead_id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_call_logs: {
        Row: {
          call_outcome: string
          called_by: string
          created_at: string
          id: string
          interest_status: string | null
          lead_id: string
          notes: string | null
        }
        Insert: {
          call_outcome: string
          called_by: string
          created_at?: string
          id?: string
          interest_status?: string | null
          lead_id: string
          notes?: string | null
        }
        Update: {
          call_outcome?: string
          called_by?: string
          created_at?: string
          id?: string
          interest_status?: string | null
          lead_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_import_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_count: number
          errors: string[] | null
          id: string
          started_at: string
          status: string
          success_count: number
          total_rows: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_count?: number
          errors?: string[] | null
          id?: string
          started_at?: string
          status?: string
          success_count?: number
          total_rows?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_count?: number
          errors?: string[] | null
          id?: string
          started_at?: string
          status?: string
          success_count?: number
          total_rows?: number
          user_id?: string
        }
        Relationships: []
      }
      lead_reminders: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          lead_id: string
          notified_15min: boolean | null
          notified_30min: boolean | null
          reminder_time: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lead_id: string
          notified_15min?: boolean | null
          notified_30min?: boolean | null
          reminder_time: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lead_id?: string
          notified_15min?: boolean | null
          notified_30min?: boolean | null
          reminder_time?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_reminders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          city: string | null
          company_name: string
          contact_number: string
          conversion_date: string | null
          created_at: string
          created_by: string | null
          deal_value: number | null
          email: string | null
          follow_up_date: string | null
          id: string
          is_imported: boolean
          latitude: number | null
          lead_source: string | null
          longitude: number | null
          other_service: string | null
          pin: string | null
          poc_name: string | null
          poc_number: string | null
          remarks: string | null
          requirements: string[]
          sectors: string[] | null
          serial_number: string
          state: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          city?: string | null
          company_name: string
          contact_number: string
          conversion_date?: string | null
          created_at?: string
          created_by?: string | null
          deal_value?: number | null
          email?: string | null
          follow_up_date?: string | null
          id?: string
          is_imported?: boolean
          latitude?: number | null
          lead_source?: string | null
          longitude?: number | null
          other_service?: string | null
          pin?: string | null
          poc_name?: string | null
          poc_number?: string | null
          remarks?: string | null
          requirements?: string[]
          sectors?: string[] | null
          serial_number: string
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          city?: string | null
          company_name?: string
          contact_number?: string
          conversion_date?: string | null
          created_at?: string
          created_by?: string | null
          deal_value?: number | null
          email?: string | null
          follow_up_date?: string | null
          id?: string
          is_imported?: boolean
          latitude?: number | null
          lead_source?: string | null
          longitude?: number | null
          other_service?: string | null
          pin?: string | null
          poc_name?: string | null
          poc_number?: string | null
          remarks?: string | null
          requirements?: string[]
          sectors?: string[] | null
          serial_number?: string
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      meeting_participants: {
        Row: {
          created_at: string
          id: string
          is_attending: boolean | null
          meeting_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_attending?: boolean | null
          meeting_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_attending?: boolean | null
          meeting_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string
          id: string
          is_recurring: boolean | null
          location: string | null
          meeting_link: string | null
          meeting_type: Database["public"]["Enums"]["meeting_type"]
          project_id: string
          recurrence_days: string[] | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_pattern: string | null
          start_time: string
          status: Database["public"]["Enums"]["meeting_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time: string
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          meeting_link?: string | null
          meeting_type?: Database["public"]["Enums"]["meeting_type"]
          project_id: string
          recurrence_days?: string[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["meeting_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          meeting_link?: string | null
          meeting_type?: Database["public"]["Enums"]["meeting_type"]
          project_id?: string
          recurrence_days?: string[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["meeting_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      message_read_receipts: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_read_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mom_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          mom_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          mom_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          mom_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "mom_attachments_mom_id_fkey"
            columns: ["mom_id"]
            isOneToOne: false
            referencedRelation: "moms"
            referencedColumns: ["id"]
          },
        ]
      }
      mom_participants: {
        Row: {
          agreed_at: string | null
          created_at: string
          has_agreed: boolean | null
          id: string
          mom_id: string
          user_id: string
        }
        Insert: {
          agreed_at?: string | null
          created_at?: string
          has_agreed?: boolean | null
          id?: string
          mom_id: string
          user_id: string
        }
        Update: {
          agreed_at?: string | null
          created_at?: string
          has_agreed?: boolean | null
          id?: string
          mom_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mom_participants_mom_id_fkey"
            columns: ["mom_id"]
            isOneToOne: false
            referencedRelation: "moms"
            referencedColumns: ["id"]
          },
        ]
      }
      moms: {
        Row: {
          content: Json | null
          created_at: string
          created_by: string | null
          id: string
          is_sent: boolean | null
          project_id: string
          sent_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_sent?: boolean | null
          project_id: string
          sent_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_sent?: boolean | null
          project_id?: string
          sent_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string | null
          project_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          project_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          project_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          company_name: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          job_title: string | null
          last_seen: string | null
          phone: string | null
          state: string | null
          street_address: string | null
          theme_preference: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          job_title?: string | null
          last_seen?: string | null
          phone?: string | null
          state?: string | null
          street_address?: string | null
          theme_preference?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          job_title?: string | null
          last_seen?: string | null
          phone?: string | null
          state?: string | null
          street_address?: string | null
          theme_preference?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      task_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          task_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          task_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          task_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_by: string | null
          assigned_date: string | null
          assigned_to: string | null
          created_at: string
          deadline: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string
          remark: string | null
          status: Database["public"]["Enums"]["task_status"]
          task_name: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_by?: string | null
          assigned_date?: string | null
          assigned_to?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id: string
          remark?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_name: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_by?: string | null
          assigned_date?: string | null
          assigned_to?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string
          remark?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_paid: number
          client_id: string
          created_at: string
          created_by: string | null
          estimate_id: string | null
          id: string
          invoice_id: string | null
          payment_mode: string
          receipt_url: string | null
          remarks: string | null
          status: string
          transaction_date: string
          updated_at: string
          utr_reference_number: string | null
          verified_by: string | null
          verified_date: string | null
        }
        Insert: {
          amount_paid?: number
          client_id: string
          created_at?: string
          created_by?: string | null
          estimate_id?: string | null
          id?: string
          invoice_id?: string | null
          payment_mode?: string
          receipt_url?: string | null
          remarks?: string | null
          status?: string
          transaction_date?: string
          updated_at?: string
          utr_reference_number?: string | null
          verified_by?: string | null
          verified_date?: string | null
        }
        Update: {
          amount_paid?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          estimate_id?: string | null
          id?: string
          invoice_id?: string | null
          payment_mode?: string
          receipt_url?: string | null
          remarks?: string | null
          status?: string
          transaction_date?: string
          updated_at?: string
          utr_reference_number?: string | null
          verified_by?: string | null
          verified_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "billing_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          created_at: string
          id: string
          last_heartbeat: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_heartbeat?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_heartbeat?: string
          status?: string
          user_id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      profiles_public: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          job_title: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          job_title?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          job_title?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_bd_marketing: { Args: { _user_id: string }; Returns: boolean }
      is_digital_marketer: { Args: { _user_id: string }; Returns: boolean }
      is_graphic_designer: { Args: { _user_id: string }; Returns: boolean }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_meeting_participant: {
        Args: { _meeting_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "manager"
        | "client"
        | "bd_marketing"
        | "digital_marketer"
        | "graphic_designer"
      lead_status:
        | "new_lead"
        | "contacted"
        | "follow_up_required"
        | "meeting_scheduled"
        | "proposal_sent"
        | "converted"
        | "lost"
        | "not_interested"
      meeting_status: "scheduled" | "completed" | "cancelled"
      meeting_type: "online" | "offline"
      project_role: "owner" | "member" | "viewer"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status:
        | "todo"
        | "in_progress"
        | "in_review"
        | "approved"
        | "rejected"
        | "completed"
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
        "manager",
        "client",
        "bd_marketing",
        "digital_marketer",
        "graphic_designer",
      ],
      lead_status: [
        "new_lead",
        "contacted",
        "follow_up_required",
        "meeting_scheduled",
        "proposal_sent",
        "converted",
        "lost",
        "not_interested",
      ],
      meeting_status: ["scheduled", "completed", "cancelled"],
      meeting_type: ["online", "offline"],
      project_role: ["owner", "member", "viewer"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: [
        "todo",
        "in_progress",
        "in_review",
        "approved",
        "rejected",
        "completed",
      ],
    },
  },
} as const
