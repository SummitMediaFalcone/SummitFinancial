// Auto-generated types for Supabase client.
// Replace with output of: npx supabase gen types typescript --project-id <your-id>
// after connecting the Supabase CLI.

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string
                    full_name: string | null
                    role: "Admin" | "Finance" | "Viewer"
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email: string
                    full_name?: string | null
                    role?: "Admin" | "Finance" | "Viewer"
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    full_name?: string | null
                    role?: "Admin" | "Finance" | "Viewer"
                    updated_at?: string
                }
                Relationships: []
            }
            companies: {
                Row: {
                    id: string
                    name: string
                    dba: string | null
                    ein_masked: string
                    ein_encrypted: string | null
                    address_line1: string
                    address_line2: string | null
                    address_city: string
                    address_state: string
                    address_zip: string
                    phone: string
                    bank_name: string | null
                    routing_masked: string | null
                    routing_encrypted: string | null
                    account_masked: string | null
                    account_encrypted: string | null
                    check_start_number: number
                    check_layout_type: "top" | "3-per-page"
                    print_offset_x: number
                    print_offset_y: number
                    created_by: string | null
                    updated_by: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    dba?: string | null
                    ein_masked: string
                    ein_encrypted?: string | null
                    address_line1: string
                    address_line2?: string | null
                    address_city: string
                    address_state: string
                    address_zip: string
                    phone: string
                    bank_name?: string | null
                    routing_masked?: string | null
                    routing_encrypted?: string | null
                    account_masked?: string | null
                    account_encrypted?: string | null
                    check_start_number?: number
                    check_layout_type?: "top" | "3-per-page"
                    print_offset_x?: number
                    print_offset_y?: number
                    created_by?: string | null
                    updated_by?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    name?: string
                    dba?: string | null
                    ein_masked?: string
                    ein_encrypted?: string | null
                    address_line1?: string
                    address_line2?: string | null
                    address_city?: string
                    address_state?: string
                    address_zip?: string
                    phone?: string
                    bank_name?: string | null
                    routing_masked?: string | null
                    routing_encrypted?: string | null
                    account_masked?: string | null
                    account_encrypted?: string | null
                    check_start_number?: number
                    check_layout_type?: "top" | "3-per-page"
                    print_offset_x?: number
                    print_offset_y?: number
                    updated_by?: string | null
                    updated_at?: string
                }
                Relationships: []
            }
            user_company_access: {
                Row: {
                    user_id: string
                    company_id: string
                    granted_at: string
                }
                Insert: {
                    user_id: string
                    company_id: string
                    granted_at?: string
                }
                Update: {
                    granted_at?: string
                }
                Relationships: []
            }
            contractors: {
                Row: {
                    id: string
                    first_name: string
                    last_name: string
                    business_name: string | null
                    email: string
                    phone: string
                    address_line1: string
                    address_line2: string | null
                    address_city: string
                    address_state: string
                    address_zip: string
                    tin_type: "SSN" | "EIN"
                    tin_masked: string
                    tin_encrypted: string | null
                    w9_file_path: string | null
                    notes: string | null
                    created_by: string | null
                    updated_by: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    first_name: string
                    last_name: string
                    business_name?: string | null
                    email: string
                    phone: string
                    address_line1: string
                    address_line2?: string | null
                    address_city: string
                    address_state: string
                    address_zip: string
                    tin_type: "SSN" | "EIN"
                    tin_masked: string
                    tin_encrypted?: string | null
                    w9_file_path?: string | null
                    notes?: string | null
                    created_by?: string | null
                    updated_by?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    first_name?: string
                    last_name?: string
                    business_name?: string | null
                    email?: string
                    phone?: string
                    address_line1?: string
                    address_line2?: string | null
                    address_city?: string
                    address_state?: string
                    address_zip?: string
                    tin_type?: "SSN" | "EIN"
                    tin_masked?: string
                    tin_encrypted?: string | null
                    w9_file_path?: string | null
                    notes?: string | null
                    updated_by?: string | null
                    updated_at?: string
                }
                Relationships: []
            }
            contractor_company_links: {
                Row: {
                    contractor_id: string
                    company_id: string
                    default_memo: string | null
                    default_category: string | null
                    created_at: string
                }
                Insert: {
                    contractor_id: string
                    company_id: string
                    default_memo?: string | null
                    default_category?: string | null
                    created_at?: string
                }
                Update: {
                    default_memo?: string | null
                    default_category?: string | null
                }
                Relationships: []
            }
            payments: {
                Row: {
                    id: string
                    company_id: string
                    contractor_id: string
                    amount_cents: number
                    payment_date: string
                    method: "CHECK"
                    check_number: number | null
                    status: "DRAFT" | "PRINTED" | "VOID" | "CLEARED"
                    memo: string
                    category: string
                    created_by: string | null
                    updated_by: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    company_id: string
                    contractor_id: string
                    amount_cents: number
                    payment_date: string
                    method?: "CHECK"
                    check_number?: number | null
                    status?: "DRAFT" | "PRINTED" | "VOID" | "CLEARED"
                    memo: string
                    category: string
                    created_by?: string | null
                    updated_by?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    amount_cents?: number
                    payment_date?: string
                    check_number?: number | null
                    status?: "DRAFT" | "PRINTED" | "VOID" | "CLEARED"
                    memo?: string
                    category?: string
                    updated_by?: string | null
                    updated_at?: string
                }
                Relationships: []
            }
            expenses: {
                Row: {
                    id: string
                    company_id: string
                    vendor: string
                    amount_cents: number
                    expense_date: string
                    category: string
                    method: string
                    receipt_file_path: string | null
                    notes: string | null
                    created_by: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    company_id: string
                    vendor: string
                    amount_cents: number
                    expense_date: string
                    category: string
                    method: string
                    receipt_file_path?: string | null
                    notes?: string | null
                    created_by?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    vendor?: string
                    amount_cents?: number
                    expense_date?: string
                    category?: string
                    method?: string
                    receipt_file_path?: string | null
                    notes?: string | null
                    updated_at?: string
                }
                Relationships: []
            }
            audit_logs: {
                Row: {
                    id: string
                    actor_id: string | null
                    actor_email: string | null
                    action: string
                    entity_type: string
                    entity_id: string
                    company_id: string | null
                    meta: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    actor_id?: string | null
                    actor_email?: string | null
                    action: string
                    entity_type: string
                    entity_id: string
                    company_id?: string | null
                    meta?: Json | null
                    created_at?: string
                }
                Update: {
                    [key: string]: never
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            get_next_check_number: {
                Args: { p_company_id: string }
                Returns: number
            }
            is_admin: {
                Args: Record<string, never>
                Returns: boolean
            }
        }
        Enums: {
            user_role: "Admin" | "Finance" | "Viewer"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
