import pool from "../config/db";

export class EstoqueError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function quantidade(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1e9 || Math.abs(value * 1000 - Math.round(value * 1000)) > 0.00001) {
    throw new EstoqueError(400, "Informe uma quantidade de até 1 bilhão, com no máximo três casas decimais.");
  }
  return value;
}
type Execute = Parameters<Parameters<typeof pool.transaction>[0]>[0];
export function registrar(execute: Execute, produtoId: number, valor: number, tipo: string, observacao: string, usuarioId: number, chave: string, estornoDe?: number, permitirInativo = false) {
  quantidade(valor);
  if (valor <= 0 || !["entrada", "saida"].includes(tipo)) throw new EstoqueError(400, "Informe entrada ou saída e quantidade maior que zero.");
  if (!Number.isSafeInteger(produtoId) || produtoId <= 0) throw new EstoqueError(400, "Produto inválido.");
  if (typeof observacao !== "string" || observacao.length > 500) throw new EstoqueError(400, "A observação deve ter até 500 caracteres.");
  if (typeof chave !== "string" || !/^[\w-]{16,80}$/.test(chave)) throw new EstoqueError(400, "Envie uma chave Idempotency-Key válida.");
  const anterior = execute("SELECT * FROM pi2_movimentos_estoque WHERE movimento_chave = $1", [chave]).rows[0];
  if (anterior) {
    if (anterior.movimento_produto_id !== produtoId || anterior.movimento_quantidade !== valor || anterior.movimento_tipo !== tipo || anterior.movimento_usuario_id !== usuarioId || anterior.movimento_observacao !== observacao || (anterior.movimento_estorno_de ?? null) !== (estornoDe ?? null)) {
      throw new EstoqueError(409, "Esta chave já foi usada em outra operação.");
    }
    return anterior;
  }
  const produto = execute("SELECT * FROM pi2_produtos WHERE produto_id = $1", [produtoId]).rows[0];
  if (!produto) throw new EstoqueError(404, "Produto não encontrado.");
  if (!produto.produto_estado && !estornoDe && !permitirInativo) throw new EstoqueError(409, "O produto está inativo.");
  const saldo = quantidade(produto.produto_quantidade_estoque ?? 0);
  const novo = (Math.round(saldo * 1000) + (tipo === "entrada" ? 1 : -1) * Math.round(valor * 1000)) / 1000;
  if (novo < 0) throw new EstoqueError(409, "Saldo insuficiente para esta operação.");
  quantidade(novo);
  execute("UPDATE pi2_produtos SET produto_quantidade_estoque = $2 WHERE produto_id = $1", [produtoId, novo]);
  return execute(`INSERT INTO pi2_movimentos_estoque
    (movimento_produto_id, movimento_quantidade, movimento_tipo, movimento_data, movimento_observacao,
     movimento_usuario_id, movimento_chave, movimento_estorno_de, movimento_saldo_anterior, movimento_saldo_posterior)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [produtoId, valor, tipo, new Date().toISOString(), observacao, usuarioId, chave, estornoDe, saldo, novo]).rows[0];
}
export function movimentar(body: any, usuarioId: number, chave: string) {
  return pool.transaction(execute => {
    const user=execute('SELECT usuario_perfil_id,usuario_status,usuario_operar_estoque FROM pi2_usuarios WHERE usuario_id=$1',[usuarioId]).rows[0];
    if(!user?.usuario_status||(![1,2].includes(user.usuario_perfil_id)&&!user.usuario_operar_estoque))throw new EstoqueError(403,'Esta conta não está autorizada a operar o estoque.');
    return registrar(execute,body.movimento_produto_id,body.movimento_quantidade,body.movimento_tipo,body.movimento_observacao??'',usuarioId,chave);
  });
}
export function estornar(id: number, motivo: string, usuarioId: number, chave: string) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new EstoqueError(400, "Movimentação inválida.");
  if (typeof motivo !== "string" || motivo.trim().length < 3 || motivo.length > 450) throw new EstoqueError(400, "Informe um motivo de 3 a 450 caracteres.");
  return pool.transaction(execute => {
    const original = execute("SELECT * FROM pi2_movimentos_estoque WHERE movimento_id = $1", [id]).rows[0];
    if (original?.movimento_item_pedido_id || execute('SELECT 1 FROM pi2_entrega_itens WHERE movimento_id=$1',[id]).rows.length) throw new EstoqueError(409, "Movimento vinculado a entrega de pedido. Use a devolução no pedido para preservar as quantidades recebidas.");
    if (!original) throw new EstoqueError(404, "Movimentação não encontrada.");
    if (original.movimento_estorno_de || original.movimento_saldo_anterior === null) throw new EstoqueError(409, "Esta movimentação não pode ser estornada.");
    const existente = execute("SELECT * FROM pi2_movimentos_estoque WHERE movimento_estorno_de = $1", [id]).rows[0];
    if (existente && existente.movimento_chave !== chave) throw new EstoqueError(409, "Esta movimentação já foi estornada.");
    return registrar(execute, original.movimento_produto_id, original.movimento_quantidade, original.movimento_tipo === "entrada" ? "saida" : "entrada", `Estorno #${id}: ${motivo.trim()}`, usuarioId, chave, id);
  });
}
