'use server';

/**
 * @fileOverview Moderates a customer-submitted image for an e-commerce platform to check for content policy violations.
 *
 * - moderateReviewImage - A function that handles the image moderation process.
 * - ModerateReviewImageInput - The input type for the moderateReviewImage function.
 * - ModerateReviewImageOutput - The return type for the moderateReviewImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ModerateReviewImageInputSchema = z.object({
  productDetails: z.string().describe('Details of the product purchased.'),
  productImages: z
    .string()
    .array()
    .describe(
      'Array of product images as data URIs that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' /* Example: [\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w+bOnYsAAAAAADhlWwfrw8P////nAANLwOD9+vXvMwAAoSEWHSgCWgAAAABJRU5ErkJggg==\'] */
    ),
  customerImage: z
    .string()
    .describe(
      'The customer-submitted image as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type ModerateReviewImageInput = z.infer<typeof ModerateReviewImageInputSchema>;

const ModerateReviewImageOutputSchema = z.object({
  approved: z.boolean().describe('Whether the image is approved or rejected.'),
  reason: z.string().describe('Detailed explanation for the approval/rejection decision.'),
});
export type ModerateReviewImageOutput = z.infer<typeof ModerateReviewImageOutputSchema>;

export async function moderateReviewImage(input: ModerateReviewImageInput): Promise<ModerateReviewImageOutput> {
  return moderateReviewImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'moderateReviewImagePrompt',
  input: {schema: ModerateReviewImageInputSchema},
  output: {schema: ModerateReviewImageOutputSchema},
  prompt: `You are an expert moderator for an Indian e-commerce platform.
  You need to determine whether a customer-submitted image is appropriate to be displayed on the website.
  Consider the following factors:

  - Image should not contain profane/abusive content
  - Image doesn't match the product purchased
  - Image doesn't match the brand of the product purchased
  - Image lacks focus on the product purchased
  - Image should not be a screenshot
  - Image should not be of poor quality
  - Image should not be blurred
  - Image should not be Incomplete or cropped
  - Image should not contain personal or sensitive information
  - Image should not contain reference to other platforms or retailers
  - Image should not contains service related feedback (about shipment) Ex: fake or damaged product received
  - There should not be any error in opening image

  Here is the product information:
  Product Details: {{{productDetails}}}
  Product Images: {{#each productImages}} {{media url=this}} {{/each}}
  Customer Image: {{media url=customerImage}}

  Based on these criteria, decide whether to approve or reject the customer image.
  If you reject the image, provide a detailed explanation.

  Respond in the following JSON format:
  {
    "approved": boolean, // true if the image is approved, false if rejected
    "reason": string // detailed explanation for the decision
  }`,
});

const moderateReviewImageFlow = ai.defineFlow(
  {
    name: 'moderateReviewImageFlow',
    inputSchema: ModerateReviewImageInputSchema,
    outputSchema: ModerateReviewImageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
