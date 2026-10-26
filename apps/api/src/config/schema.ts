export const schema = `
CREATE TABLE IF NOT EXISTS pi2_fornecedores (
  fornecedor_id INTEGER PRIMARY KEY AUTOINCREMENT,
  fornecedor_nome TEXT,
  fornecedor_contato TEXT,
  fornecedor_endereco TEXT
);
CREATE TABLE IF NOT EXISTS pi2_perfis (
  perfil_id INTEGER PRIMARY KEY AUTOINCREMENT,
  perfil_nome TEXT
);
CREATE TABLE IF NOT EXISTS pi2_historico_estados_pedido (
  historico_id INTEGER PRIMARY KEY AUTOINCREMENT,
  historico_pedido_id INTEGER REFERENCES pi2_pedidos(pedido_id),
  historico_estado_id INTEGER REFERENCES pi2_estados_pedido(estado_pedido_id),
  historico_data TEXT,
  historico_usuario_id INTEGER REFERENCES pi2_usuarios(usuario_id),
  historico_observacao TEXT
);
CREATE TABLE IF NOT EXISTS pi2_precos (
  preco_id INTEGER PRIMARY KEY AUTOINCREMENT,
  preco_compra TEXT,
  preco_venda TEXT,
  preco_data_inicial TEXT,
  preco_data_final TEXT
);
CREATE TABLE IF NOT EXISTS pi2_unidades (
  unidade_id INTEGER PRIMARY KEY AUTOINCREMENT,
  unidade_descricao TEXT
);
CREATE TABLE IF NOT EXISTS pi2_pedidos (
  pedido_id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_fornecedor_id INTEGER REFERENCES pi2_fornecedores(fornecedor_id),
  pedido_data TEXT,
  pedido_usuario_id INTEGER REFERENCES pi2_usuarios(usuario_id),
  pedido_estado_id INTEGER REFERENCES pi2_estados_pedido(estado_pedido_id),
  pedido_observacao TEXT,
  pedido_total REAL
);
CREATE TABLE IF NOT EXISTS pi2_estados_pedido (
  estado_pedido_id INTEGER PRIMARY KEY AUTOINCREMENT,
  estado_pedido_descricao TEXT
);
CREATE TABLE IF NOT EXISTS pi2_usuarios (
  usuario_id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_nome TEXT NOT NULL UNIQUE,
  usuario_email TEXT NOT NULL UNIQUE,
  usuario_password TEXT,
  usuario_nome_completo TEXT,
  usuario_inscricao TEXT,
  usuario_perfil_id INTEGER REFERENCES pi2_perfis(perfil_id),
  usuario_status INTEGER CHECK (usuario_status IN (0, 1))
);
CREATE TABLE IF NOT EXISTS pi2_produtos (
  produto_id INTEGER PRIMARY KEY AUTOINCREMENT,
  produto_descricao TEXT,
  produto_fornecedor_id INTEGER REFERENCES pi2_fornecedores(fornecedor_id),
  produto_preco_id INTEGER REFERENCES pi2_precos(preco_id),
  produto_unidade_id INTEGER REFERENCES pi2_unidades(unidade_id),
  produto_categoria_id INTEGER REFERENCES pi2_categorias(categoria_id),
  produto_quantidade_estoque REAL,
  produto_data_validade TEXT,
  produto_codigo_barras TEXT,
  produto_estado INTEGER CHECK (produto_estado IN (0, 1))
);
CREATE TABLE IF NOT EXISTS pi2_itens_pedido (
  item_pedido_id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_pedido_pedido_id INTEGER REFERENCES pi2_pedidos(pedido_id),
  item_pedido_produto_id INTEGER REFERENCES pi2_produtos(produto_id),
  item_pedido_unidade_id INTEGER REFERENCES pi2_unidades(unidade_id),
  item_pedido_preco_id INTEGER REFERENCES pi2_precos(preco_id),
  item_pedido_quantidade REAL,
  item_pedido_total REAL
);
CREATE TABLE IF NOT EXISTS pi2_categorias (
  categoria_id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria_descricao TEXT
);
CREATE TABLE IF NOT EXISTS pi2_movimentos_estoque (
  movimento_id INTEGER PRIMARY KEY AUTOINCREMENT,
  movimento_produto_id INTEGER REFERENCES pi2_produtos(produto_id),
  movimento_quantidade REAL,
  movimento_tipo TEXT,
  movimento_data TEXT,
  movimento_observacao TEXT
);
CREATE INDEX IF NOT EXISTS idx_produto_fornecedor_id ON pi2_produtos(produto_fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_produto_preco_id ON pi2_produtos(produto_preco_id);
CREATE INDEX IF NOT EXISTS idx_produto_unidade_id ON pi2_produtos(produto_unidade_id);
CREATE INDEX IF NOT EXISTS idx_produto_categoria_id ON pi2_produtos(produto_categoria_id);
CREATE INDEX IF NOT EXISTS idx_usuario_perfil_id ON pi2_usuarios(usuario_perfil_id);
CREATE INDEX IF NOT EXISTS idx_pedido_fornecedor_id ON pi2_pedidos(pedido_fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_pedido_usuario_id ON pi2_pedidos(pedido_usuario_id);
CREATE INDEX IF NOT EXISTS idx_pedido_estado_id ON pi2_pedidos(pedido_estado_id);
CREATE INDEX IF NOT EXISTS idx_item_pedido_pedido_id ON pi2_itens_pedido(item_pedido_pedido_id);
CREATE INDEX IF NOT EXISTS idx_item_pedido_produto_id ON pi2_itens_pedido(item_pedido_produto_id);
CREATE INDEX IF NOT EXISTS idx_item_pedido_unidade_id ON pi2_itens_pedido(item_pedido_unidade_id);
CREATE INDEX IF NOT EXISTS idx_item_pedido_preco_id ON pi2_itens_pedido(item_pedido_preco_id);
CREATE INDEX IF NOT EXISTS idx_movimento_produto_id ON pi2_movimentos_estoque(movimento_produto_id);
CREATE INDEX IF NOT EXISTS idx_historico_pedido_id ON pi2_historico_estados_pedido(historico_pedido_id);
CREATE INDEX IF NOT EXISTS idx_historico_estado_id ON pi2_historico_estados_pedido(historico_estado_id);
CREATE INDEX IF NOT EXISTS idx_historico_usuario_id ON pi2_historico_estados_pedido(historico_usuario_id);
`;
