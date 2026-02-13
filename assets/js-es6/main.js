import "./router.js";
import "./config/config.js";

import { initHeaderScroll } from "./ui-ux/dynamic-visibility-header.js";
import { initUserMenu } from "./ui-ux/menu-flutuante-header.js";
import { initTemplateOptions } from "./controllers/options-templates.js";


initUserMenu(); // Ativa o menu flutuante do header
initHeaderScroll(); // Ativa o monitoramento do scroll
initTemplateOptions(); // Ativa o menu de opções dos templates (Inativar/Ativar)
