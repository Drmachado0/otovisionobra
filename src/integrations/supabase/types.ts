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
      action_log: {
        Row: {
          action_type: string
          details: Json | null
          device_id: string | null
          executed_at: string | null
          id: string
          ig_account_id: string | null
          status: string
          target_url: string | null
          target_username: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          details?: Json | null
          device_id?: string | null
          executed_at?: string | null
          id?: string
          ig_account_id?: string | null
          status: string
          target_url?: string | null
          target_username?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          details?: Json | null
          device_id?: string | null
          executed_at?: string | null
          id?: string
          ig_account_id?: string | null
          status?: string
          target_url?: string | null
          target_username?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_log_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      agendamentos: {
        Row: {
          convenio: string | null
          created_at: string
          data_hora: string
          id: string
          lembrete_enviado: boolean | null
          local: string
          observacoes: string | null
          paciente_id: string
          phone_number: string
          status: string
          tipo_consulta: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          convenio?: string | null
          created_at?: string
          data_hora: string
          id?: string
          lembrete_enviado?: boolean | null
          local: string
          observacoes?: string | null
          paciente_id: string
          phone_number: string
          status?: string
          tipo_consulta?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          convenio?: string | null
          created_at?: string
          data_hora?: string
          id?: string
          lembrete_enviado?: boolean | null
          local?: string
          observacoes?: string | null
          paciente_id?: string
          phone_number?: string
          status?: string
          tipo_consulta?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "vw_painel_pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          condition: string | null
          id: number
          last_triggered: string | null
          source: string | null
          threshold: number | null
        }
        Insert: {
          condition?: string | null
          id?: number
          last_triggered?: string | null
          source?: string | null
          threshold?: number | null
        }
        Update: {
          condition?: string | null
          id?: number
          last_triggered?: string | null
          source?: string | null
          threshold?: number | null
        }
        Relationships: []
      }
      atendimentos: {
        Row: {
          assunto: string | null
          avaliacao: number | null
          created_at: string
          fim: string | null
          id: string
          inicio: string
          local_preferido: string | null
          observacoes: string | null
          paciente_id: string
          phone_number: string
          status: string
          tipo: string | null
          total_mensagens: number
          updated_at: string
        }
        Insert: {
          assunto?: string | null
          avaliacao?: number | null
          created_at?: string
          fim?: string | null
          id?: string
          inicio?: string
          local_preferido?: string | null
          observacoes?: string | null
          paciente_id: string
          phone_number: string
          status?: string
          tipo?: string | null
          total_mensagens?: number
          updated_at?: string
        }
        Update: {
          assunto?: string | null
          avaliacao?: number | null
          created_at?: string
          fim?: string | null
          id?: string
          inicio?: string
          local_preferido?: string | null
          observacoes?: string | null
          paciente_id?: string
          phone_number?: string
          status?: string
          tipo?: string | null
          total_mensagens?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atendimentos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimentos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "vw_painel_pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_commands: {
        Row: {
          command: string
          created_at: string | null
          device_id: string | null
          executed_at: string | null
          id: string
          ig_account_id: string
          params: Json | null
          result: Json | null
          status: string
          user_id: string
        }
        Insert: {
          command: string
          created_at?: string | null
          device_id?: string | null
          executed_at?: string | null
          id?: string
          ig_account_id: string
          params?: Json | null
          result?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          command?: string
          created_at?: string | null
          device_id?: string | null
          executed_at?: string | null
          id?: string
          ig_account_id?: string
          params?: Json | null
          result?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_commands_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bridge_tokens: {
        Row: {
          created_at: string | null
          id: string
          ig_account_id: string | null
          is_active: boolean | null
          last_used_at: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ig_account_id?: string | null
          is_active?: boolean | null
          last_used_at?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ig_account_id?: string | null
          is_active?: boolean | null
          last_used_at?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bridge_tokens_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_action_cache: {
        Row: {
          action_type: string
          day: string
          failed_count: number | null
          ig_account_id: string
          success_count: number | null
          total_count: number | null
          user_id: string
        }
        Insert: {
          action_type: string
          day: string
          failed_count?: number | null
          ig_account_id: string
          success_count?: number | null
          total_count?: number | null
          user_id: string
        }
        Update: {
          action_type?: string
          day?: string
          failed_count?: number | null
          ig_account_id?: string
          success_count?: number | null
          total_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_action_cache_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_arquivos: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          pasta: string
          storage_path: string
          tags: string[] | null
          tamanho: number
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          pasta?: string
          storage_path: string
          tags?: string[] | null
          tamanho?: number
          tipo?: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          pasta?: string
          storage_path?: string
          tags?: string[] | null
          tamanho?: number
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      growth_stats: {
        Row: {
          device_id: string | null
          followers_count: number | null
          following_count: number | null
          id: string
          ig_account_id: string | null
          posts_count: number | null
          recorded_at: string | null
          user_id: string | null
        }
        Insert: {
          device_id?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          ig_account_id?: string | null
          posts_count?: number | null
          recorded_at?: string | null
          user_id?: string | null
        }
        Update: {
          device_id?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          ig_account_id?: string | null
          posts_count?: number | null
          recorded_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "growth_stats_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_accounts: {
        Row: {
          bot_mode: string | null
          bot_online: boolean | null
          bot_schedule: Json | null
          bot_status: string | null
          bridge_link_token: string | null
          bridge_version: string | null
          cooldown_escalation: number | null
          cooldown_remaining_minutes: number | null
          created_at: string | null
          daily_heat: number | null
          delay_max: number | null
          delay_min: number | null
          device_id: string | null
          followers_count: number | null
          following_count: number | null
          id: string
          ig_user_id: string | null
          ig_username: string
          is_active: boolean | null
          last_heartbeat: string | null
          likes_per_follow: number | null
          max_actions_per_session: number | null
          organic_timings: Json | null
          posts_count: number | null
          profile_pic_url: string | null
          queue_processed: number | null
          queue_total: number | null
          safety_limits: Json | null
          safety_preset: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          bot_mode?: string | null
          bot_online?: boolean | null
          bot_schedule?: Json | null
          bot_status?: string | null
          bridge_link_token?: string | null
          bridge_version?: string | null
          cooldown_escalation?: number | null
          cooldown_remaining_minutes?: number | null
          created_at?: string | null
          daily_heat?: number | null
          delay_max?: number | null
          delay_min?: number | null
          device_id?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          ig_user_id?: string | null
          ig_username: string
          is_active?: boolean | null
          last_heartbeat?: string | null
          likes_per_follow?: number | null
          max_actions_per_session?: number | null
          organic_timings?: Json | null
          posts_count?: number | null
          profile_pic_url?: string | null
          queue_processed?: number | null
          queue_total?: number | null
          safety_limits?: Json | null
          safety_preset?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          bot_mode?: string | null
          bot_online?: boolean | null
          bot_schedule?: Json | null
          bot_status?: string | null
          bridge_link_token?: string | null
          bridge_version?: string | null
          cooldown_escalation?: number | null
          cooldown_remaining_minutes?: number | null
          created_at?: string | null
          daily_heat?: number | null
          delay_max?: number | null
          delay_min?: number | null
          device_id?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          ig_user_id?: string | null
          ig_username?: string
          is_active?: boolean | null
          last_heartbeat?: string | null
          likes_per_follow?: number | null
          max_actions_per_session?: number | null
          organic_timings?: Json | null
          posts_count?: number | null
          profile_pic_url?: string | null
          queue_processed?: number | null
          queue_total?: number | null
          safety_limits?: Json | null
          safety_preset?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      mensagens: {
        Row: {
          atendimento_id: string | null
          conteudo: string | null
          created_at: string
          direcao: string
          id: string
          message_id_whatsapp: string | null
          metadata: Json | null
          paciente_id: string
          phone_number: string
          tipo_mensagem: string
        }
        Insert: {
          atendimento_id?: string | null
          conteudo?: string | null
          created_at?: string
          direcao: string
          id?: string
          message_id_whatsapp?: string | null
          metadata?: Json | null
          paciente_id: string
          phone_number: string
          tipo_mensagem?: string
        }
        Update: {
          atendimento_id?: string | null
          conteudo?: string | null
          created_at?: string
          direcao?: string
          id?: string
          message_id_whatsapp?: string | null
          metadata?: Json | null
          paciente_id?: string
          phone_number?: string
          tipo_mensagem?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "vw_atendimentos_ativos"
            referencedColumns: ["atendimento_id"]
          },
          {
            foreignKeyName: "mensagens_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "vw_painel_pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics: {
        Row: {
          id: number
          metric_name: string | null
          metric_value: number | null
          source: string | null
          timestamp: string | null
        }
        Insert: {
          id?: number
          metric_name?: string | null
          metric_value?: number | null
          source?: string | null
          timestamp?: string | null
        }
        Update: {
          id?: number
          metric_name?: string | null
          metric_value?: number | null
          source?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      mission_crons: {
        Row: {
          created_at: string | null
          error_log: string | null
          id: string
          last_result: string | null
          last_run: string | null
          metadata: Json | null
          next_run: string | null
          nome: string
          schedule: string
          status: string | null
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_log?: string | null
          id?: string
          last_result?: string | null
          last_run?: string | null
          metadata?: Json | null
          next_run?: string | null
          nome: string
          schedule: string
          status?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_log?: string | null
          id?: string
          last_result?: string | null
          last_run?: string | null
          metadata?: Json | null
          next_run?: string | null
          nome?: string
          schedule?: string
          status?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mission_health: {
        Row: {
          componente: string
          created_at: string | null
          id: string
          mensagem: string | null
          metadata: Json | null
          status: string | null
          tempo_resposta_ms: number | null
          ultima_verificacao: string | null
        }
        Insert: {
          componente: string
          created_at?: string | null
          id?: string
          mensagem?: string | null
          metadata?: Json | null
          status?: string | null
          tempo_resposta_ms?: number | null
          ultima_verificacao?: string | null
        }
        Update: {
          componente?: string
          created_at?: string | null
          id?: string
          mensagem?: string | null
          metadata?: Json | null
          status?: string | null
          tempo_resposta_ms?: number | null
          ultima_verificacao?: string | null
        }
        Relationships: []
      }
      mission_memory: {
        Row: {
          categoria: string
          conteudo: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          relevancia: string | null
          source_file: string | null
          tags: string[] | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          categoria: string
          conteudo?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          relevancia?: string | null
          source_file?: string | null
          tags?: string[] | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          categoria?: string
          conteudo?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          relevancia?: string | null
          source_file?: string | null
          tags?: string[] | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mission_stats: {
        Row: {
          fonte: string
          id: string
          metadata: Json | null
          metrica: string
          periodo: string | null
          recorded_at: string | null
          unidade: string | null
          valor: number | null
        }
        Insert: {
          fonte: string
          id?: string
          metadata?: Json | null
          metrica: string
          periodo?: string | null
          recorded_at?: string | null
          unidade?: string | null
          valor?: number | null
        }
        Update: {
          fonte?: string
          id?: string
          metadata?: Json | null
          metrica?: string
          periodo?: string | null
          recorded_at?: string | null
          unidade?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      mission_tasks: {
        Row: {
          agente: string | null
          created_at: string | null
          criado_por: string | null
          descricao: string | null
          id: string
          metadata: Json | null
          prazo: string | null
          prioridade: string | null
          projeto: string | null
          responsavel: string | null
          status: string | null
          tags: string[] | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          agente?: string | null
          created_at?: string | null
          criado_por?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json | null
          prazo?: string | null
          prioridade?: string | null
          projeto?: string | null
          responsavel?: string | null
          status?: string | null
          tags?: string[] | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          agente?: string | null
          created_at?: string | null
          criado_por?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json | null
          prazo?: string | null
          prioridade?: string | null
          projeto?: string | null
          responsavel?: string | null
          status?: string | null
          tags?: string[] | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      n8n_fila_mensagens: {
        Row: {
          id: number
          id_mensagem: string
          mensagem: string
          telefone: string
          timestamp: string
        }
        Insert: {
          id?: number
          id_mensagem: string
          mensagem: string
          telefone: string
          timestamp: string
        }
        Update: {
          id?: number
          id_mensagem?: string
          mensagem?: string
          telefone?: string
          timestamp?: string
        }
        Relationships: []
      }
      n8n_historico_mensagens: {
        Row: {
          created_at: string
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          created_at?: string
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      n8n_status_atendimento: {
        Row: {
          id: number
          lock_conversa: boolean | null
          session_id: string
          updated_at: string
        }
        Insert: {
          id?: number
          lock_conversa?: boolean | null
          session_id: string
          updated_at?: string
        }
        Update: {
          id?: number
          lock_conversa?: boolean | null
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      obra_audit_log: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          ip_address: string | null
          registro_id: string
          tabela: string
          user_email: string
          user_id: string
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: string | null
          registro_id?: string
          tabela: string
          user_email?: string
          user_id: string
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: string | null
          registro_id?: string
          tabela?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_comissao_pagamentos: {
        Row: {
          auto: boolean
          categoria: string
          created_at: string
          data_pagamento: string
          deleted_at: string | null
          forma_pagamento: string
          fornecedor: string
          id: string
          mes: string
          observacoes: string
          pago: boolean
          transacao_id: string | null
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          auto?: boolean
          categoria?: string
          created_at?: string
          data_pagamento?: string
          deleted_at?: string | null
          forma_pagamento?: string
          fornecedor?: string
          id?: string
          mes?: string
          observacoes?: string
          pago?: boolean
          transacao_id?: string | null
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          auto?: boolean
          categoria?: string
          created_at?: string
          data_pagamento?: string
          deleted_at?: string | null
          forma_pagamento?: string
          fornecedor?: string
          id?: string
          mes?: string
          observacoes?: string
          pago?: boolean
          transacao_id?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "obra_comissao_pagamentos_transacao_id_fkey"
            columns: ["transacao_id"]
            isOneToOne: false
            referencedRelation: "obra_transacoes_fluxo"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_composicoes: {
        Row: {
          categoria: string
          created_at: string
          custo_unitario: number
          id: string
          insumos: Json
          nome: string
          unidade: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          custo_unitario?: number
          id?: string
          insumos?: Json
          nome?: string
          unidade?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string
          created_at?: string
          custo_unitario?: number
          id?: string
          insumos?: Json
          nome?: string
          unidade?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_compras: {
        Row: {
          anexo_id: string
          categoria: string
          conta_id: string
          created_at: string
          data: string
          data_entrega_prevista: string
          data_entrega_real: string
          deleted_at: string | null
          descricao: string
          forma_pagamento: string
          fornecedor: string
          fornecedor_id: string
          id: string
          itens: Json
          nf_vinculada: string
          numero_parcelas: number
          observacoes: string
          orcamento_vinculado_id: string
          parcelas: Json
          status_entrega: string
          updated_at: string
          user_id: string
          valor_total: number
        }
        Insert: {
          anexo_id?: string
          categoria?: string
          conta_id?: string
          created_at?: string
          data?: string
          data_entrega_prevista?: string
          data_entrega_real?: string
          deleted_at?: string | null
          descricao?: string
          forma_pagamento?: string
          fornecedor?: string
          fornecedor_id?: string
          id?: string
          itens?: Json
          nf_vinculada?: string
          numero_parcelas?: number
          observacoes?: string
          orcamento_vinculado_id?: string
          parcelas?: Json
          status_entrega?: string
          updated_at?: string
          user_id: string
          valor_total?: number
        }
        Update: {
          anexo_id?: string
          categoria?: string
          conta_id?: string
          created_at?: string
          data?: string
          data_entrega_prevista?: string
          data_entrega_real?: string
          deleted_at?: string | null
          descricao?: string
          forma_pagamento?: string
          fornecedor?: string
          fornecedor_id?: string
          id?: string
          itens?: Json
          nf_vinculada?: string
          numero_parcelas?: number
          observacoes?: string
          orcamento_vinculado_id?: string
          parcelas?: Json
          status_entrega?: string
          updated_at?: string
          user_id?: string
          valor_total?: number
        }
        Relationships: []
      }
      obra_conciliacoes_bancarias: {
        Row: {
          conciliado_em: string | null
          conciliado_por: string | null
          created_at: string
          desfeito_em: string | null
          desfeito_por: string | null
          id: string
          motivo_desfazer: string
          motivo_matching: string
          movimentacao_extraida_id: string
          observacoes: string
          score_compatibilidade: number
          status_conciliacao: string
          tipo_conciliacao: string
          transacao_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conciliado_em?: string | null
          conciliado_por?: string | null
          created_at?: string
          desfeito_em?: string | null
          desfeito_por?: string | null
          id?: string
          motivo_desfazer?: string
          motivo_matching?: string
          movimentacao_extraida_id: string
          observacoes?: string
          score_compatibilidade?: number
          status_conciliacao?: string
          tipo_conciliacao?: string
          transacao_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conciliado_em?: string | null
          conciliado_por?: string | null
          created_at?: string
          desfeito_em?: string | null
          desfeito_por?: string | null
          id?: string
          motivo_desfazer?: string
          motivo_matching?: string
          movimentacao_extraida_id?: string
          observacoes?: string
          score_compatibilidade?: number
          status_conciliacao?: string
          tipo_conciliacao?: string
          transacao_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_conciliacoes_bancarias_movimentacao_extraida_id_fkey"
            columns: ["movimentacao_extraida_id"]
            isOneToOne: false
            referencedRelation: "obra_movimentacoes_extraidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_conciliacoes_bancarias_transacao_id_fkey"
            columns: ["transacao_id"]
            isOneToOne: false
            referencedRelation: "obra_transacoes_fluxo"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_config: {
        Row: {
          area_construida: number
          categorias: Json
          contato_responsavel: string
          created_at: string
          data_inicio: string
          data_termino: string
          endereco: string
          formas_pagamento: Json
          id: string
          nome_obra: string
          orcamento_total: number
          responsavel: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_construida?: number
          categorias?: Json
          contato_responsavel?: string
          created_at?: string
          data_inicio?: string
          data_termino?: string
          endereco?: string
          formas_pagamento?: Json
          id?: string
          nome_obra?: string
          orcamento_total?: number
          responsavel?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_construida?: number
          categorias?: Json
          contato_responsavel?: string
          created_at?: string
          data_inicio?: string
          data_termino?: string
          endereco?: string
          formas_pagamento?: Json
          id?: string
          nome_obra?: string
          orcamento_total?: number
          responsavel?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_contas_financeiras: {
        Row: {
          ativa: boolean
          cor: string
          created_at: string
          id: string
          nome: string
          observacoes: string
          saldo_inicial: number
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativa?: boolean
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          observacoes?: string
          saldo_inicial?: number
          tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativa?: boolean
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          observacoes?: string
          saldo_inicial?: number
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_cronograma: {
        Row: {
          categoria: string
          created_at: string
          custo_previsto: number
          custo_real: number
          dependencias: Json
          descricao: string
          fim_previsto: string
          fim_real: string | null
          id: string
          inicio_previsto: string
          inicio_real: string | null
          nome: string
          observacoes: string
          orcamento_vinculado: string
          percentual_conclusao: number
          responsavel: string
          responsavel_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          custo_previsto?: number
          custo_real?: number
          dependencias?: Json
          descricao?: string
          fim_previsto?: string
          fim_real?: string | null
          id?: string
          inicio_previsto?: string
          inicio_real?: string | null
          nome?: string
          observacoes?: string
          orcamento_vinculado?: string
          percentual_conclusao?: number
          responsavel?: string
          responsavel_id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string
          created_at?: string
          custo_previsto?: number
          custo_real?: number
          dependencias?: Json
          descricao?: string
          fim_previsto?: string
          fim_real?: string | null
          id?: string
          inicio_previsto?: string
          inicio_real?: string | null
          nome?: string
          observacoes?: string
          orcamento_vinculado?: string
          percentual_conclusao?: number
          responsavel?: string
          responsavel_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_diario: {
        Row: {
          atividades: string
          avanco_percentual: number
          clima: string
          created_at: string
          data: string
          equipes: Json
          etapas_trabalhadas: Json
          fotos: Json
          id: string
          observacoes: string
          problemas: string
          updated_at: string
          user_id: string
        }
        Insert: {
          atividades?: string
          avanco_percentual?: number
          clima?: string
          created_at?: string
          data?: string
          equipes?: Json
          etapas_trabalhadas?: Json
          fotos?: Json
          id?: string
          observacoes?: string
          problemas?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          atividades?: string
          avanco_percentual?: number
          clima?: string
          created_at?: string
          data?: string
          equipes?: Json
          etapas_trabalhadas?: Json
          fotos?: Json
          id?: string
          observacoes?: string
          problemas?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_documentos_processados: {
        Row: {
          caminho_origem: string
          confianca_extracao: number
          created_at: string
          documento_relacionado_id: string | null
          duplicidade_score: number
          duplicidade_status: string
          hash_arquivo: string
          id: string
          motivo_erro: string
          motivo_revisao: string
          nome_arquivo: string
          origem_arquivo: string
          payload_bruto: Json | null
          payload_normalizado: Json | null
          status_processamento: string
          storage_path: string
          tipo_arquivo: string
          tipo_documento: string
          updated_at: string
          user_id: string
        }
        Insert: {
          caminho_origem?: string
          confianca_extracao?: number
          created_at?: string
          documento_relacionado_id?: string | null
          duplicidade_score?: number
          duplicidade_status?: string
          hash_arquivo?: string
          id?: string
          motivo_erro?: string
          motivo_revisao?: string
          nome_arquivo: string
          origem_arquivo?: string
          payload_bruto?: Json | null
          payload_normalizado?: Json | null
          status_processamento?: string
          storage_path?: string
          tipo_arquivo?: string
          tipo_documento?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          caminho_origem?: string
          confianca_extracao?: number
          created_at?: string
          documento_relacionado_id?: string | null
          duplicidade_score?: number
          duplicidade_status?: string
          hash_arquivo?: string
          id?: string
          motivo_erro?: string
          motivo_revisao?: string
          nome_arquivo?: string
          origem_arquivo?: string
          payload_bruto?: Json | null
          payload_normalizado?: Json | null
          status_processamento?: string
          storage_path?: string
          tipo_arquivo?: string
          tipo_documento?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_documentos_processados_documento_relacionado_id_fkey"
            columns: ["documento_relacionado_id"]
            isOneToOne: false
            referencedRelation: "obra_documentos_processados"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_eventos_conciliacao: {
        Row: {
          acao: string
          conciliacao_id: string
          created_at: string
          detalhes: Json | null
          id: string
          user_id: string
        }
        Insert: {
          acao?: string
          conciliacao_id: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          acao?: string
          conciliacao_id?: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_eventos_conciliacao_conciliacao_id_fkey"
            columns: ["conciliacao_id"]
            isOneToOne: false
            referencedRelation: "obra_conciliacoes_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_eventos_processamento: {
        Row: {
          created_at: string
          detalhes: Json | null
          documento_id: string
          etapa: string
          id: string
          mensagem: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detalhes?: Json | null
          documento_id: string
          etapa?: string
          id?: string
          mensagem?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          detalhes?: Json | null
          documento_id?: string
          etapa?: string
          id?: string
          mensagem?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_eventos_processamento_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "obra_documentos_processados"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_fornecedores: {
        Row: {
          agencia: string
          avaliacao: number
          banco: string
          cnpj: string
          conta: string
          created_at: string
          deleted_at: string | null
          email: string
          endereco: string
          especialidade: string
          id: string
          nome: string
          observacoes: string
          pix: string
          responsavel: string
          status: string
          telefone: string
          total_gasto: number
          updated_at: string
          user_id: string
        }
        Insert: {
          agencia?: string
          avaliacao?: number
          banco?: string
          cnpj?: string
          conta?: string
          created_at?: string
          deleted_at?: string | null
          email?: string
          endereco?: string
          especialidade?: string
          id?: string
          nome?: string
          observacoes?: string
          pix?: string
          responsavel?: string
          status?: string
          telefone?: string
          total_gasto?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          agencia?: string
          avaliacao?: number
          banco?: string
          cnpj?: string
          conta?: string
          created_at?: string
          deleted_at?: string | null
          email?: string
          endereco?: string
          especialidade?: string
          id?: string
          nome?: string
          observacoes?: string
          pix?: string
          responsavel?: string
          status?: string
          telefone?: string
          total_gasto?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_funcionarios: {
        Row: {
          created_at: string
          funcao: string
          id: string
          nome: string
          observacoes: string
          salario_diario: number
          status: string
          telefone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          funcao?: string
          id?: string
          nome?: string
          observacoes?: string
          salario_diario?: number
          status?: string
          telefone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          funcao?: string
          id?: string
          nome?: string
          observacoes?: string
          salario_diario?: number
          status?: string
          telefone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_leitor_historico: {
        Row: {
          created_at: string
          dados: Json
          data: string
          fornecedor: string
          id: string
          status: string
          tipo: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          dados?: Json
          data?: string
          fornecedor?: string
          id?: string
          status?: string
          tipo?: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          dados?: Json
          data?: string
          fornecedor?: string
          id?: string
          status?: string
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      obra_medicoes: {
        Row: {
          created_at: string
          data: string
          descricao: string
          id: string
          itens: Json
          observacoes: string
          percentual_geral: number
          updated_at: string
          user_id: string
          valor_total_medido: number
        }
        Insert: {
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          itens?: Json
          observacoes?: string
          percentual_geral?: number
          updated_at?: string
          user_id: string
          valor_total_medido?: number
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          itens?: Json
          observacoes?: string
          percentual_geral?: number
          updated_at?: string
          user_id?: string
          valor_total_medido?: number
        }
        Relationships: []
      }
      obra_movimentacoes_extraidas: {
        Row: {
          categoria_sugerida: string
          created_at: string
          data_movimentacao: string
          descricao: string
          documento_id: string
          id: string
          saldo: number | null
          score_confianca: number
          score_duplicidade: number
          status_revisao: string
          tipo_movimentacao: string
          transacao_id: string | null
          user_id: string
          valor: number
        }
        Insert: {
          categoria_sugerida?: string
          created_at?: string
          data_movimentacao?: string
          descricao?: string
          documento_id: string
          id?: string
          saldo?: number | null
          score_confianca?: number
          score_duplicidade?: number
          status_revisao?: string
          tipo_movimentacao?: string
          transacao_id?: string | null
          user_id: string
          valor?: number
        }
        Update: {
          categoria_sugerida?: string
          created_at?: string
          data_movimentacao?: string
          descricao?: string
          documento_id?: string
          id?: string
          saldo?: number | null
          score_confianca?: number
          score_duplicidade?: number
          status_revisao?: string
          tipo_movimentacao?: string
          transacao_id?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "obra_movimentacoes_extraidas_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "obra_documentos_processados"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_notas_fiscais: {
        Row: {
          anexo_id: string
          categoria: string
          chave_nfe: string
          cnpj: string
          compra_vinculada_id: string
          conta_id: string
          created_at: string
          data_emissao: string
          data_pagamento: string
          data_vencimento: string
          deleted_at: string | null
          desconto: number
          descricao: string
          etapa_cronograma: string
          forma_pagamento: string
          forma_pagamento_tipo: string
          fornecedor: string
          fornecedor_id: string
          id: string
          impostos: Json
          itens: Json
          numero: string
          numero_parcelas: number
          observacoes: string
          orcamento_vinculado: string
          parcelas: Json
          status: string
          updated_at: string
          user_id: string
          valor_bruto: number
          valor_liquido: number
        }
        Insert: {
          anexo_id?: string
          categoria?: string
          chave_nfe?: string
          cnpj?: string
          compra_vinculada_id?: string
          conta_id?: string
          created_at?: string
          data_emissao?: string
          data_pagamento?: string
          data_vencimento?: string
          deleted_at?: string | null
          desconto?: number
          descricao?: string
          etapa_cronograma?: string
          forma_pagamento?: string
          forma_pagamento_tipo?: string
          fornecedor?: string
          fornecedor_id?: string
          id?: string
          impostos?: Json
          itens?: Json
          numero?: string
          numero_parcelas?: number
          observacoes?: string
          orcamento_vinculado?: string
          parcelas?: Json
          status?: string
          updated_at?: string
          user_id: string
          valor_bruto?: number
          valor_liquido?: number
        }
        Update: {
          anexo_id?: string
          categoria?: string
          chave_nfe?: string
          cnpj?: string
          compra_vinculada_id?: string
          conta_id?: string
          created_at?: string
          data_emissao?: string
          data_pagamento?: string
          data_vencimento?: string
          deleted_at?: string | null
          desconto?: number
          descricao?: string
          etapa_cronograma?: string
          forma_pagamento?: string
          forma_pagamento_tipo?: string
          fornecedor?: string
          fornecedor_id?: string
          id?: string
          impostos?: Json
          itens?: Json
          numero?: string
          numero_parcelas?: number
          observacoes?: string
          orcamento_vinculado?: string
          parcelas?: Json
          status?: string
          updated_at?: string
          user_id?: string
          valor_bruto?: number
          valor_liquido?: number
        }
        Relationships: []
      }
      obra_notificacoes: {
        Row: {
          created_at: string
          id: string
          link: string | null
          mensagem: string
          prioridade: string
          read_at: string | null
          status: string
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          mensagem?: string
          prioridade?: string
          read_at?: string | null
          status?: string
          tipo?: string
          titulo?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          mensagem?: string
          prioridade?: string
          read_at?: string | null
          status?: string
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_notification_preferences: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          tipo: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_orcamentos: {
        Row: {
          anexo_id: string
          categoria: string
          condicoes_pagamento: string
          conta_id: string
          created_at: string
          data: string
          deleted_at: string | null
          descricao: string
          forma_pagamento_tipo: string
          fornecedor: string
          fornecedor_id: string
          garantia: string
          historico: Json
          id: string
          itens: Json
          motivo_reprovacao: string
          nf_vinculada: string
          numero_parcelas: number
          observacoes: string
          parcelas_geradas: Json
          prazo_execucao: string
          status: string
          updated_at: string
          user_id: string
          validade: string
          valor_total: number
        }
        Insert: {
          anexo_id?: string
          categoria?: string
          condicoes_pagamento?: string
          conta_id?: string
          created_at?: string
          data?: string
          deleted_at?: string | null
          descricao?: string
          forma_pagamento_tipo?: string
          fornecedor?: string
          fornecedor_id?: string
          garantia?: string
          historico?: Json
          id?: string
          itens?: Json
          motivo_reprovacao?: string
          nf_vinculada?: string
          numero_parcelas?: number
          observacoes?: string
          parcelas_geradas?: Json
          prazo_execucao?: string
          status?: string
          updated_at?: string
          user_id: string
          validade?: string
          valor_total?: number
        }
        Update: {
          anexo_id?: string
          categoria?: string
          condicoes_pagamento?: string
          conta_id?: string
          created_at?: string
          data?: string
          deleted_at?: string | null
          descricao?: string
          forma_pagamento_tipo?: string
          fornecedor?: string
          fornecedor_id?: string
          garantia?: string
          historico?: Json
          id?: string
          itens?: Json
          motivo_reprovacao?: string
          nf_vinculada?: string
          numero_parcelas?: number
          observacoes?: string
          parcelas_geradas?: Json
          prazo_execucao?: string
          status?: string
          updated_at?: string
          user_id?: string
          validade?: string
          valor_total?: number
        }
        Relationships: []
      }
      obra_registro_mao_de_obra: {
        Row: {
          created_at: string
          data: string
          etapa: string
          funcionario_id: string
          horas_trabalhadas: number
          id: string
          observacoes: string
          updated_at: string
          user_id: string
          valor_diaria: number
        }
        Insert: {
          created_at?: string
          data?: string
          etapa?: string
          funcionario_id?: string
          horas_trabalhadas?: number
          id?: string
          observacoes?: string
          updated_at?: string
          user_id: string
          valor_diaria?: number
        }
        Update: {
          created_at?: string
          data?: string
          etapa?: string
          funcionario_id?: string
          horas_trabalhadas?: number
          id?: string
          observacoes?: string
          updated_at?: string
          user_id?: string
          valor_diaria?: number
        }
        Relationships: []
      }
      obra_sugestoes_conciliacao: {
        Row: {
          created_at: string
          id: string
          motivo_matching: string
          movimentacao_extraida_id: string
          score_compatibilidade: number
          status_sugestao: string
          transacao_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          motivo_matching?: string
          movimentacao_extraida_id: string
          score_compatibilidade?: number
          status_sugestao?: string
          transacao_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          motivo_matching?: string
          movimentacao_extraida_id?: string
          score_compatibilidade?: number
          status_sugestao?: string
          transacao_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_sugestoes_conciliacao_movimentacao_extraida_id_fkey"
            columns: ["movimentacao_extraida_id"]
            isOneToOne: false
            referencedRelation: "obra_movimentacoes_extraidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_sugestoes_conciliacao_transacao_id_fkey"
            columns: ["transacao_id"]
            isOneToOne: false
            referencedRelation: "obra_transacoes_fluxo"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_transacao_anexos: {
        Row: {
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          transaction_id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          file_name: string
          file_path: string
          file_size?: number
          file_type?: string
          id?: string
          transaction_id: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          transaction_id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      obra_transacoes_fluxo: {
        Row: {
          categoria: string
          conciliado: boolean
          conciliado_em: string | null
          conta_id: string
          created_at: string
          data: string
          deleted_at: string | null
          descricao: string
          extrato_arquivo: string | null
          extrato_fit_id: string | null
          forma_pagamento: string
          id: string
          metodo_pagamento: string | null
          observacoes: string
          origem_id: string | null
          origem_tipo: string | null
          recorrencia: string
          recorrencia_ativa: boolean
          recorrencia_fim: string | null
          recorrencia_frequencia: string | null
          recorrencia_grupo_id: string | null
          recorrencia_mae: boolean
          recorrencia_max_ocorrencias: number | null
          recorrencia_ocorrencias_criadas: number
          referencia: string
          tipo: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: string
          conciliado?: boolean
          conciliado_em?: string | null
          conta_id?: string
          created_at?: string
          data?: string
          deleted_at?: string | null
          descricao?: string
          extrato_arquivo?: string | null
          extrato_fit_id?: string | null
          forma_pagamento?: string
          id?: string
          metodo_pagamento?: string | null
          observacoes?: string
          origem_id?: string | null
          origem_tipo?: string | null
          recorrencia?: string
          recorrencia_ativa?: boolean
          recorrencia_fim?: string | null
          recorrencia_frequencia?: string | null
          recorrencia_grupo_id?: string | null
          recorrencia_mae?: boolean
          recorrencia_max_ocorrencias?: number | null
          recorrencia_ocorrencias_criadas?: number
          referencia?: string
          tipo?: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          categoria?: string
          conciliado?: boolean
          conciliado_em?: string | null
          conta_id?: string
          created_at?: string
          data?: string
          deleted_at?: string | null
          descricao?: string
          extrato_arquivo?: string | null
          extrato_fit_id?: string | null
          forma_pagamento?: string
          id?: string
          metodo_pagamento?: string | null
          observacoes?: string
          origem_id?: string | null
          origem_tipo?: string | null
          recorrencia?: string
          recorrencia_ativa?: boolean
          recorrencia_fim?: string | null
          recorrencia_frequencia?: string | null
          recorrencia_grupo_id?: string | null
          recorrencia_mae?: boolean
          recorrencia_max_ocorrencias?: number | null
          recorrencia_ocorrencias_criadas?: number
          referencia?: string
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      of_compras: {
        Row: {
          conta_id: string | null
          created_at: string
          data: string
          descricao: string
          forma_pagamento: string
          fornecedor_id: string | null
          id: string
          numero_parcelas: number
          obra_id: string | null
          orcamento_id: string | null
          status: string
          updated_at: string
          user_id: string
          valor_total: number
        }
        Insert: {
          conta_id?: string | null
          created_at?: string
          data?: string
          descricao?: string
          forma_pagamento?: string
          fornecedor_id?: string | null
          id?: string
          numero_parcelas?: number
          obra_id?: string | null
          orcamento_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          valor_total?: number
        }
        Update: {
          conta_id?: string | null
          created_at?: string
          data?: string
          descricao?: string
          forma_pagamento?: string
          fornecedor_id?: string | null
          id?: string
          numero_parcelas?: number
          obra_id?: string | null
          orcamento_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "of_compras_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "of_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_compras_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "of_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_compras_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "of_obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_compras_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "of_orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      of_contas: {
        Row: {
          ativa: boolean
          banco: string
          created_at: string
          id: string
          nome: string
          saldo_atual: number
          saldo_inicial: number
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativa?: boolean
          banco?: string
          created_at?: string
          id?: string
          nome?: string
          saldo_atual?: number
          saldo_inicial?: number
          tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativa?: boolean
          banco?: string
          created_at?: string
          id?: string
          nome?: string
          saldo_atual?: number
          saldo_inicial?: number
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      of_extratos_importados: {
        Row: {
          arquivo_nome: string
          conta_id: string
          data_fim: string | null
          data_inicio: string | null
          fit_id_range: string
          id: string
          importado_em: string
          total_conciliadas: number
          total_transacoes: number
          user_id: string
        }
        Insert: {
          arquivo_nome?: string
          conta_id: string
          data_fim?: string | null
          data_inicio?: string | null
          fit_id_range?: string
          id?: string
          importado_em?: string
          total_conciliadas?: number
          total_transacoes?: number
          user_id: string
        }
        Update: {
          arquivo_nome?: string
          conta_id?: string
          data_fim?: string | null
          data_inicio?: string | null
          fit_id_range?: string
          id?: string
          importado_em?: string
          total_conciliadas?: number
          total_transacoes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "of_extratos_importados_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "of_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      of_fornecedores: {
        Row: {
          categoria: string
          created_at: string
          documento: string
          email: string
          id: string
          nome: string
          observacoes: string
          telefone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          documento?: string
          email?: string
          id?: string
          nome?: string
          observacoes?: string
          telefone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string
          created_at?: string
          documento?: string
          email?: string
          id?: string
          nome?: string
          observacoes?: string
          telefone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      of_notas_fiscais: {
        Row: {
          arquivo_url: string | null
          chave_acesso: string
          compra_id: string | null
          created_at: string
          data_emissao: string
          fornecedor_id: string | null
          id: string
          numero: string
          serie: string
          status: string
          transacao_id: string | null
          updated_at: string
          user_id: string
          valor_bruto: number
          valor_liquido: number
        }
        Insert: {
          arquivo_url?: string | null
          chave_acesso?: string
          compra_id?: string | null
          created_at?: string
          data_emissao?: string
          fornecedor_id?: string | null
          id?: string
          numero?: string
          serie?: string
          status?: string
          transacao_id?: string | null
          updated_at?: string
          user_id: string
          valor_bruto?: number
          valor_liquido?: number
        }
        Update: {
          arquivo_url?: string | null
          chave_acesso?: string
          compra_id?: string | null
          created_at?: string
          data_emissao?: string
          fornecedor_id?: string | null
          id?: string
          numero?: string
          serie?: string
          status?: string
          transacao_id?: string | null
          updated_at?: string
          user_id?: string
          valor_bruto?: number
          valor_liquido?: number
        }
        Relationships: [
          {
            foreignKeyName: "of_notas_fiscais_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "of_compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_notas_fiscais_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "of_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_notas_fiscais_transacao_id_fkey"
            columns: ["transacao_id"]
            isOneToOne: false
            referencedRelation: "of_transacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      of_obras: {
        Row: {
          created_at: string
          data_inicio: string | null
          data_previsao_fim: string | null
          endereco: string
          id: string
          nome: string
          orcamento_total_previsto: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_inicio?: string | null
          data_previsao_fim?: string | null
          endereco?: string
          id?: string
          nome?: string
          orcamento_total_previsto?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_inicio?: string | null
          data_previsao_fim?: string | null
          endereco?: string
          id?: string
          nome?: string
          orcamento_total_previsto?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      of_orcamentos: {
        Row: {
          anexo_url: string | null
          compra_id: string | null
          created_at: string
          data: string
          descricao: string
          fornecedor_id: string | null
          id: string
          obra_id: string | null
          status: string
          updated_at: string
          user_id: string
          validade_ate: string | null
          valor_total: number
        }
        Insert: {
          anexo_url?: string | null
          compra_id?: string | null
          created_at?: string
          data?: string
          descricao?: string
          fornecedor_id?: string | null
          id?: string
          obra_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          validade_ate?: string | null
          valor_total?: number
        }
        Update: {
          anexo_url?: string | null
          compra_id?: string | null
          created_at?: string
          data?: string
          descricao?: string
          fornecedor_id?: string | null
          id?: string
          obra_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          validade_ate?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_of_orcamentos_compra"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "of_compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_orcamentos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "of_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_orcamentos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "of_obras"
            referencedColumns: ["id"]
          },
        ]
      }
      of_parcelas: {
        Row: {
          compra_id: string
          created_at: string
          data_pagamento: string | null
          id: string
          numero: number
          status: string
          transacao_id: string | null
          updated_at: string
          user_id: string
          valor: number
          vencimento: string
        }
        Insert: {
          compra_id: string
          created_at?: string
          data_pagamento?: string | null
          id?: string
          numero?: number
          status?: string
          transacao_id?: string | null
          updated_at?: string
          user_id: string
          valor?: number
          vencimento?: string
        }
        Update: {
          compra_id?: string
          created_at?: string
          data_pagamento?: string | null
          id?: string
          numero?: number
          status?: string
          transacao_id?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "of_parcelas_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "of_compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_parcelas_transacao_id_fkey"
            columns: ["transacao_id"]
            isOneToOne: false
            referencedRelation: "of_transacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      of_recorrencias: {
        Row: {
          ativa: boolean
          categoria: string
          conta_id: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string
          dia_vencimento: number
          frequencia: string
          id: string
          tipo: string
          ultima_geracao_em: string | null
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          ativa?: boolean
          categoria?: string
          conta_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string
          dia_vencimento?: number
          frequencia?: string
          id?: string
          tipo?: string
          ultima_geracao_em?: string | null
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          ativa?: boolean
          categoria?: string
          conta_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string
          dia_vencimento?: number
          frequencia?: string
          id?: string
          tipo?: string
          ultima_geracao_em?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "of_recorrencias_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "of_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      of_transacoes: {
        Row: {
          categoria: string
          conciliado: boolean
          conciliado_em: string | null
          conta_id: string
          created_at: string
          data: string
          descricao: string
          extrato_arquivo: string | null
          extrato_fit_id: string | null
          id: string
          metodo_pagamento: string
          obra_id: string | null
          observacoes: string
          origem_id: string | null
          origem_tipo: string | null
          tipo: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: string
          conciliado?: boolean
          conciliado_em?: string | null
          conta_id: string
          created_at?: string
          data?: string
          descricao?: string
          extrato_arquivo?: string | null
          extrato_fit_id?: string | null
          id?: string
          metodo_pagamento?: string
          obra_id?: string | null
          observacoes?: string
          origem_id?: string | null
          origem_tipo?: string | null
          tipo?: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          categoria?: string
          conciliado?: boolean
          conciliado_em?: string | null
          conta_id?: string
          created_at?: string
          data?: string
          descricao?: string
          extrato_arquivo?: string | null
          extrato_fit_id?: string | null
          id?: string
          metodo_pagamento?: string
          obra_id?: string | null
          observacoes?: string
          origem_id?: string | null
          origem_tipo?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "of_transacoes_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "of_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_transacoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "of_obras"
            referencedColumns: ["id"]
          },
        ]
      }
      pacientes: {
        Row: {
          convenio: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          origem: string | null
          phone_number: string
          primeiro_contato: string
          remote_jid: string
          status: string
          tags: string[] | null
          total_atendimentos: number
          total_mensagens: number
          ultimo_contato: string
          updated_at: string
        }
        Insert: {
          convenio?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string | null
          phone_number: string
          primeiro_contato?: string
          remote_jid: string
          status?: string
          tags?: string[] | null
          total_atendimentos?: number
          total_mensagens?: number
          ultimo_contato?: string
          updated_at?: string
        }
        Update: {
          convenio?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string | null
          phone_number?: string
          primeiro_contato?: string
          remote_jid?: string
          status?: string
          tags?: string[] | null
          total_atendimentos?: number
          total_mensagens?: number
          ultimo_contato?: string
          updated_at?: string
        }
        Relationships: []
      }
      paper_trades: {
        Row: {
          direction: string | null
          entry_price: number | null
          exit_price: number | null
          id: number
          market_id: string | null
          market_name: string | null
          pnl: number | null
          quantity: number | null
          strategy: string | null
          timestamp: string | null
        }
        Insert: {
          direction?: string | null
          entry_price?: number | null
          exit_price?: number | null
          id?: number
          market_id?: string | null
          market_name?: string | null
          pnl?: number | null
          quantity?: number | null
          strategy?: string | null
          timestamp?: string | null
        }
        Update: {
          direction?: string | null
          entry_price?: number | null
          exit_price?: number | null
          id?: number
          market_id?: string | null
          market_name?: string | null
          pnl?: number | null
          quantity?: number | null
          strategy?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      portfolio: {
        Row: {
          cash: number | null
          id: number
          positions: Json | null
          total_value: number | null
          updated_at: string | null
        }
        Insert: {
          cash?: number | null
          id?: number
          positions?: Json | null
          total_value?: number | null
          updated_at?: string | null
        }
        Update: {
          cash?: number | null
          id?: number
          positions?: Json | null
          total_value?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_lists: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          ig_account_id: string
          name: string
          updated_at: string | null
          user_id: string
          username_count: number
        }
        Insert: {
          created_at?: string | null
          data?: Json
          id?: string
          ig_account_id: string
          name: string
          updated_at?: string | null
          user_id: string
          username_count?: number
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          ig_account_id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
          username_count?: number
        }
        Relationships: []
      }
      session_stats: {
        Row: {
          blocks_count: number | null
          comments_count: number | null
          device_id: string | null
          errors_count: number | null
          follows_count: number | null
          id: string
          ig_account_id: string | null
          likes_count: number | null
          session_end: string | null
          session_start: string | null
          skips_count: number | null
          unfollows_count: number | null
          user_id: string | null
        }
        Insert: {
          blocks_count?: number | null
          comments_count?: number | null
          device_id?: string | null
          errors_count?: number | null
          follows_count?: number | null
          id?: string
          ig_account_id?: string | null
          likes_count?: number | null
          session_end?: string | null
          session_start?: string | null
          skips_count?: number | null
          unfollows_count?: number | null
          user_id?: string | null
        }
        Update: {
          blocks_count?: number | null
          comments_count?: number | null
          device_id?: string | null
          errors_count?: number | null
          follows_count?: number | null
          id?: string
          ig_account_id?: string | null
          likes_count?: number | null
          session_end?: string | null
          session_start?: string | null
          skips_count?: number | null
          unfollows_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_stats_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      target_queue: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          details: Json | null
          device_id: string | null
          id: string
          ig_account_id: string
          priority: number | null
          processed_at: string | null
          source: string | null
          status: string | null
          username: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          details?: Json | null
          device_id?: string | null
          id?: string
          ig_account_id: string
          priority?: number | null
          processed_at?: string | null
          source?: string | null
          status?: string | null
          username: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          details?: Json | null
          device_id?: string | null
          id?: string
          ig_account_id?: string
          priority?: number | null
          processed_at?: string | null
          source?: string | null
          status?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "target_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "targeting_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_queue_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      targeting_campaigns: {
        Row: {
          competitors: Json | null
          created_at: string
          hashtags: Json | null
          id: string
          ig_account_id: string | null
          is_active: boolean | null
          location: string | null
          name: string
          niche: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          competitors?: Json | null
          created_at?: string
          hashtags?: Json | null
          id?: string
          ig_account_id?: string | null
          is_active?: boolean | null
          location?: string | null
          name: string
          niche?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          competitors?: Json | null
          created_at?: string
          hashtags?: Json | null
          id?: string
          ig_account_id?: string | null
          is_active?: boolean | null
          location?: string | null
          name?: string
          niche?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "targeting_campaigns_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      user_settings: {
        Row: {
          automation_paused: boolean | null
          automation_paused_at: string | null
          id: string
          settings_json: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          automation_paused?: boolean | null
          automation_paused_at?: string | null
          id?: string
          settings_json?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          automation_paused?: boolean | null
          automation_paused_at?: string | null
          id?: string
          settings_json?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      whitelist: {
        Row: {
          added_at: string | null
          full_name: string | null
          id: string
          ig_account_id: string | null
          ig_user_id: string
          profile_pic_url: string | null
          reason: string | null
          user_id: string
          username: string
        }
        Insert: {
          added_at?: string | null
          full_name?: string | null
          id?: string
          ig_account_id?: string | null
          ig_user_id: string
          profile_pic_url?: string | null
          reason?: string | null
          user_id: string
          username: string
        }
        Update: {
          added_at?: string | null
          full_name?: string | null
          id?: string
          ig_account_id?: string | null
          ig_user_id?: string
          profile_pic_url?: string | null
          reason?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      daily_action_summary: {
        Row: {
          action_type: string | null
          day: string | null
          failed_count: number | null
          ig_account_id: string | null
          success_count: number | null
          total_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_log_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_last_30_days: {
        Row: {
          day: string | null
          followers_count: number | null
          following_count: number | null
          ig_account_id: string | null
          posts_count: number | null
          recorded_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "growth_stats_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_atendimentos_ativos: {
        Row: {
          assunto: string | null
          atendimento_id: string | null
          convenio: string | null
          inicio: string | null
          minutos_ativo: number | null
          nome: string | null
          phone_number: string | null
          tipo: string | null
          total_mensagens: number | null
        }
        Relationships: []
      }
      vw_painel_pacientes: {
        Row: {
          consultas_pendentes: number | null
          convenio: string | null
          id: string | null
          nome: string | null
          phone_number: string | null
          primeiro_contato: string | null
          proxima_consulta: string | null
          status: string | null
          tags: string[] | null
          total_atendimentos: number | null
          total_mensagens: number | null
          ultimo_contato: string | null
        }
        Insert: {
          consultas_pendentes?: never
          convenio?: string | null
          id?: string | null
          nome?: string | null
          phone_number?: string | null
          primeiro_contato?: string | null
          proxima_consulta?: never
          status?: string | null
          tags?: string[] | null
          total_atendimentos?: number | null
          total_mensagens?: number | null
          ultimo_contato?: string | null
        }
        Update: {
          consultas_pendentes?: never
          convenio?: string | null
          id?: string | null
          nome?: string | null
          phone_number?: string | null
          primeiro_contato?: string | null
          proxima_consulta?: never
          status?: string | null
          tags?: string[] | null
          total_atendimentos?: number | null
          total_mensagens?: number | null
          ultimo_contato?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_targets_batch: {
        Args: {
          p_campaign_id?: string
          p_ig_account_id: string
          p_source?: string
          p_usernames: string[]
        }
        Returns: number
      }
      auto_provision_ig_account: {
        Args: { p_device_id: string; p_ig_username: string }
        Returns: string
      }
      cleanup_growth_stats: { Args: never; Returns: number }
      clear_target_queue: {
        Args: { p_ig_account_id: string; p_status?: string }
        Returns: number
      }
      create_compra_atomica: {
        Args: { p_comissao?: Json; p_compra: Json; p_transacao?: Json }
        Returns: Json
      }
      fetch_next_targets: {
        Args: { p_ig_account_id: string; p_limit?: number }
        Returns: {
          campaign_id: string
          campaign_name: string
          campaign_niche: string
          id: string
          priority: number
          source: string
          username: string
        }[]
      }
      fetch_pending_targets: {
        Args: { p_ig_account_id: string; p_limit?: number }
        Returns: {
          campaign_id: string | null
          created_at: string | null
          details: Json | null
          device_id: string | null
          id: string
          ig_account_id: string
          priority: number | null
          processed_at: string | null
          source: string | null
          status: string | null
          username: string
        }[]
        SetofOptions: {
          from: "*"
          to: "target_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      generate_bridge_token: {
        Args: { p_ig_account_id: string }
        Returns: string
      }
      get_dashboard_summary: {
        Args: { p_ig_account_id: string }
        Returns: Json
      }
      get_or_create_atendimento: {
        Args: {
          p_paciente_id: string
          p_phone_number: string
          p_timeout_horas?: number
        }
        Returns: string
      }
      get_rate_limits: { Args: { p_user_id: string }; Returns: Json }
      get_today_actions: {
        Args: { p_ig_account_id: string }
        Returns: {
          action_type: string
          count: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_targets_done: {
        Args: { p_ig_account_id: string; p_target_ids: string[] }
        Returns: number
      }
      pagar_nf_atomica: {
        Args: {
          p_comissao?: Json
          p_compra_nova?: Json
          p_compra_vinculada_id?: string
          p_conta_id: string
          p_metodo: string
          p_nf_id: string
          p_parcelas?: Json
          p_transacao?: Json
        }
        Returns: Json
      }
      pagar_parcela_atomica: {
        Args: {
          p_compra_id: string
          p_numero_parcela: number
          p_transacao: Json
        }
        Returns: string
      }
      registrar_mensagem: {
        Args: {
          p_conteudo: string
          p_direcao?: string
          p_message_id?: string
          p_metadata?: Json
          p_nome: string
          p_phone_number: string
          p_remote_jid: string
          p_tipo_mensagem?: string
        }
        Returns: {
          atendimento_id: string
          mensagem_id: string
          paciente_id: string
        }[]
      }
      remove_duplicate_targets: {
        Args: { p_ig_account_id: string }
        Returns: number
      }
      send_bot_command: {
        Args: { p_command: string; p_ig_account_id: string; p_params: Json }
        Returns: string
      }
      upsert_paciente: {
        Args: { p_nome?: string; p_phone_number: string; p_remote_jid: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "financeiro" | "construtor" | "visualizador"
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
      app_role: ["admin", "financeiro", "construtor", "visualizador"],
    },
  },
} as const
