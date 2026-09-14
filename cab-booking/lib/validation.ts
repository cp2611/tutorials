import { z } from "zod";
import { CAB_TYPES, TRIP_TYPES } from "@/config/fares";

const tripTypeEnum = z.enum(TRIP_TYPES.map((t) => t.id) as [string, ...string[]]);
const cabTypeEnum = z.enum(CAB_TYPES.map((c) => c.id) as [string, ...string[]]);

export const quoteSchema = z.object({
  tripType: tripTypeEnum,
  cabTypeId: cabTypeEnum,
  pickupCity: z.string().max(80).optional(),
  dropCity: z.string().max(80).optional(),
  distanceKm: z.coerce.number().min(1).max(4000).optional(),
  pickupAt: z.string().max(40).optional(),
  returnAt: z.string().max(40).optional(),
  zoneId: z.string().max(60).optional(),
  packageId: z.string().max(60).optional(),
});

export const utmSchema = z
  .object({
    source: z.string().max(120).optional(),
    medium: z.string().max(120).optional(),
    campaign: z.string().max(160).optional(),
    term: z.string().max(160).optional(),
    content: z.string().max(160).optional(),
    gclid: z.string().max(200).optional(),
    fbclid: z.string().max(200).optional(),
    referrer: z.string().max(300).optional(),
    landingPath: z.string().max(300).optional(),
  })
  .optional();

export const createOrderSchema = quoteSchema.extend({
  customerName: z.string().trim().min(2, "Enter your name").max(80),
  customerPhone: z.string().trim().min(10, "Enter a valid mobile number").max(20),
  customerEmail: z.email("Enter a valid email").max(120).optional().or(z.literal("")),
  pickupAddress: z.string().trim().max(300).optional(),
  dropAddress: z.string().trim().max(300).optional(),
  passengers: z.coerce.number().int().min(1).max(50).optional(),
  customerNotes: z.string().trim().max(600).optional(),
  acceptTerms: z.literal(true, { error: "Please accept the terms to continue." }),
  utm: utmSchema,
  /** Hidden field that only bots fill in. Must stay empty. */
  website: z.string().max(0, { error: "Submission rejected." }).optional(),
});

/** Optional note you add when marking an advance received. Never customer input. */
export const verifyPaymentSchema = z.object({
  paymentReference: z.string().trim().max(40).optional(),
});

export const assignSchema = z.object({
  providerName: z.string().trim().max(120).optional(),
  driverName: z.string().trim().min(2).max(80),
  driverPhone: z.string().trim().min(10).max(20),
  vehicleModel: z.string().trim().max(80).optional(),
  vehicleNumber: z.string().trim().min(4).max(20),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
