import { body, param, query, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

/**
 * Validation result handler - checks for validation errors
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: "Validation failed",
      details: errors.array().map((err) => ({
        field: err.type === "field" ? (err as any).path : "unknown",
        message: err.msg,
      })),
    });
    return;
  }
  
  next();
};

/**
 * User settings validation
 */
export const validateUserSettings = [
  body("check_time")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("check_time must be in HH:MM format (24-hour)"),
  body("timezone")
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage("timezone must be a valid timezone string"),
  handleValidationErrors,
];

/**
 * Email validation
 */
export const validateEmail = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email address is required"),
  handleValidationErrors,
];

/**
 * Telegram chat ID validation
 */
export const validateTelegramLink = [
  body("telegram_chat_id")
    .isString()
    .notEmpty()
    .withMessage("Telegram chat ID is required"),
  handleValidationErrors,
];

/**
 * GitHub token validation
 */
export const validateGithubToken = [
  body("github_access_token")
    .isString()
    .notEmpty()
    .isLength({ min: 20 })
    .withMessage("Valid GitHub access token is required"),
  handleValidationErrors,
];

/**
 * Reminder type validation
 */
export const validateReminderType = [
  body("type")
    .optional()
    .isIn(["friendly", "urgent", "saved"])
    .withMessage("type must be one of: friendly, urgent, saved"),
  handleValidationErrors,
];

/**
 * Username param validation
 */
export const validateUsername = [
  param("username")
    .isString()
    .matches(/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/)
    .withMessage("Invalid GitHub username format"),
  handleValidationErrors,
];

/**
 * Pagination validation
 */
export const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage("limit must be between 1 and 100"),
  handleValidationErrors,
];

/**
 * Link code validation
 */
export const validateLinkCode = [
  body("code")
    .isString()
    .isLength({ min: 6, max: 10 })
    .isAlphanumeric()
    .withMessage("Invalid link code format"),
  handleValidationErrors,
];
