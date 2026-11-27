import { Router } from "express";

import { confirmStock, validateStock } from "../controllers/internal.controller.js";
import { requireInternalAuth } from "../middleware/internal-auth.middleware.js";

const router = Router();

router.use(requireInternalAuth);

router.post("/stock/validate", validateStock);
router.post("/stock/confirm", confirmStock);

export default router;