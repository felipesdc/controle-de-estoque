import express from "express";
import cors from "cors";
import pool from "./config/db";

import { setupSwagger } from "./config/swagger";

import perfilRoutes from "./routes/perfil-routes";
import usuarioRoutes from "./routes/usuario-routes";
import precoRoutes from "./routes/preco-routes";
import fornecedorRoutes from "./routes/fornecedor-routes";
import categoriaRoutes from "./routes/categoria-routes";
import unidadeRoutes from "./routes/unidade-routes";
import produtoRoutes from "./routes/produto-routes";
import movimentacaoEstoqueRoutes from "./routes/movimentacao-estoque-routes";
import pedidoRoutes from "./routes/pedido-routes";
import itemPedidoRoutes from "./routes/item-pedido-routes";
import estadoPedidoRoutes from "./routes/estado-pedido-routes";
import historicoEstadoPedidoRoutes from "./routes/historico-estado-pedido-routes";

import dashboardRoutes from "./routes/dashboard-routes";

const app = express();

setupSwagger(app);

// Create application/x-www-form-urlencoded parser


// Middlewares
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: false }));
app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "sqlite" });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});

// Rotas
app.use("/v1", dashboardRoutes);
app.use("/v1", perfilRoutes);
app.use("/v1", usuarioRoutes);
app.use("/v1", precoRoutes);
app.use("/v1", fornecedorRoutes);
app.use("/v1", categoriaRoutes);
app.use("/v1", unidadeRoutes);
app.use("/v1", produtoRoutes);
app.use("/v1", movimentacaoEstoqueRoutes);
app.use("/v1", pedidoRoutes);
app.use("/v1", itemPedidoRoutes);
app.use("/v1", estadoPedidoRoutes);
app.use("/v1", historicoEstadoPedidoRoutes);

// Rota raiz com template
app.get("/", (req, res) => {
  res.redirect("/api-docs");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
