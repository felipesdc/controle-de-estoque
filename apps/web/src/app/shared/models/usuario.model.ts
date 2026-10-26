export type Usuario = {
  usuario_id?: number;
  usuario_nome: string;
  usuario_email: string;
  usuario_password: string;
  usuario_nome_completo: string;
  usuario_inscricao: Date;
  usuario_perfil_id: number;
  usuario_perfil?: string;
  usuario_status: boolean;
};
