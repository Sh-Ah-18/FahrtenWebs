export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      anfrageNew: {
        Row: {
          id: number
          schicht: string
          zweck: string
          von: string
          nach: string
          mitarbeiter_id: number
          kostenstelle_id: number
          unternehmen_id: number
          ausgefuehrt: boolean
          kunde: string
          datum: string
          uhrzeit: string
          preis: number
          mehrwertsteuer: string
          fahrtinfo: string
          gruppe_id: string
          rueckfahrt?: boolean
          info?: string
          ks_real?: string
          user_id: string | null
        }
        Insert: {
          id?: number
          schicht: string
          zweck: string
          von: string
          nach: string
          mitarbeiter_id: number
          kostenstelle_id: number
          unternehmen_id: number
          ausgefuehrt: boolean
          kunde: string
          datum: string
          uhrzeit: string
          preis: number
          mehrwertsteuer: string
          fahrtinfo: string
          gruppe_id: string
          rueckfahrt?: boolean
          info?: string
          ks_real?: string
          user_id?: string | null
        }
        Update: {
          id?: number
          schicht?: string
          zweck?: string
          von?: string
          nach?: string
          mitarbeiter_id?: number
          kostenstelle_id?: number
          unternehmen_id?: number
          ausgefuehrt?: boolean
          kunde?: string
          datum?: string
          uhrzeit?: string
          preis?: number
          mehrwertsteuer?: string
          fahrtinfo?: string
          gruppe_id?: string
          rueckfahrt?: boolean
          info?: string
          ks_real?: string
          user_id?: string | null
        }
      }
      mitarbeiter: {
        Row: {
          id: number
          name: string
          handynummer: string
          kunde: string
          hausanschrift: string
          user_id: string | null
        }
        Insert: {
          id?: number
          name: string
          handynummer: string
          kunde: string
          hausanschrift: string
          user_id?: string | null
        }
        Update: {
          id?: number
          name?: string
          handynummer?: string
          kunde?: string
          hausanschrift?: string
          user_id?: string | null
        }
      }
      unternehmen: {
        Row: {
          id: number
          name: string
          nr?: number | null
          user_id: string | null
        }
        Insert: {
          id?: number
          name: string
          nr?: number | null
          user_id?: string | null
        }
        Update: {
          id?: number
          name?: string
          nr?: number | null
          user_id?: string | null
        }
      }
      kostenstelle: {
        Row: {
          id: number
          adresse: string
          nummer: string
          kunde: string
          getbipg?: string
          user_id: string | null
        }
        Insert: {
          id?: number
          adresse: string
          nummer: string
          kunde: string
          getbipg?: string
          user_id?: string | null
        }
        Update: {
          id?: number
          adresse?: string
          nummer?: string
          kunde?: string
          getbipg?: string
          user_id?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
