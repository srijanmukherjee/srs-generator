import { addDomain, getDomain, getDomains, getEstimate, updateDomain } from '../controller/domain'
import express from 'express'
import { handleAsync } from '../utils/async-handler';

const router = express.Router();

router.get("/", handleAsync(getDomains));
router.post("/", handleAsync(addDomain));
router.get("/:slug", handleAsync(getDomain));
router.patch("/:slug", handleAsync(updateDomain));
router.post("/:slug/estimate", handleAsync(getEstimate));

export { router as domainRouter };