import { getStaffs, addStaff, updateStaff } from '../controller/staff'
import express from 'express'
import { handleAsync } from '../utils/async-handler';

const router = express.Router();

router.get("/", handleAsync(getStaffs));
router.post("/", handleAsync(addStaff));
router.patch("/:abbr", handleAsync(updateStaff));

export { router as staffRouter };