import helmet from 'helmet';
import segurancaRoutes from './routes/seguranca-routes';
import {iniciarEnvio} from './services/recuperacao';
import {chaveCripto} from './services/seguranca';
import inventariosRoutes from './routes/inventarios-routes';
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

import acessosRoutes from "./routes/acessos-routes";
import cadastrosRoutes from "./routes/cadastros-routes";
import dashboardRoutes from "./routes/dashboard-routes";

import comprasRoutes from './routes/compras-routes';

import relatoriosRoutes from './routes/relatorios-routes';
const app = express();

app.disable('x-powered-by');
app.set('query parser','extended'); // Preserve typed rejection of arrays/nested filters after Express 5 upgrade.
app.set('trust proxy',1);
chaveCripto(); // Reject a malformed configured key rather than silently disabling protection.
app.use(helmet({contentSecurityPolicy:{directives:{upgradeInsecureRequests:null}},strictTransportSecurity:false}));
setupSwagger(app);

// Create application/x-www-form-urlencoded parser


// Middlewares
const publicOrigin=process.env.PUBLIC_URL?new URL(process.env.PUBLIC_URL).origin:'http://localhost:8080';
app.use(cors({origin:(origin,callback)=>callback(null,!origin||origin===publicOrigin)}));
app.use(express.json({ limit: "512kb" }));
app.use(express.urlencoded({ extended: false,limit:"512kb" }));
app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "sqlite" });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});

// Rotas
app.use("/v1",segurancaRoutes);
app.use("/v1", inventariosRoutes);
app.use("/v1", relatoriosRoutes);
app.use("/v1", comprasRoutes);
app.use("/v1", dashboardRoutes);
app.use("/v1", acessosRoutes);
app.use("/v1", cadastrosRoutes);
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

app.use((error:any,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
 if(error?.type==='entity.too.large'){res.status(413).json({message:'Requisição excede o limite de 512 KB.'});return;}
 if(error instanceof SyntaxError&&'body' in error){res.status(400).json({message:'JSON inválido.'});return;}
 console.error('Falha interna; conteúdo da requisição omitido.');res.status(500).json({message:'Não foi possível concluir a solicitação.'});
});
iniciarEnvio();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
