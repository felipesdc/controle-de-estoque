export type Pedido = {
  pedido_id?: number;
  pedido_fornecedor_id: number;
  pedido_fornecedor?: string;
  pedido_data: Date;
  pedido_usuario_id: number;
  pedido_usuario?: string;
  pedido_estado_id: number;
  pedido_estado?: string;
  pedido_observacao: string;
  pedido_total: number;
};
