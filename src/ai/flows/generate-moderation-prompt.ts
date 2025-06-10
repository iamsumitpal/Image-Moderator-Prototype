// src/ai/flows/generate-moderation-prompt.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a moderation prompt based on product details,
 * product images, and a customer review image.
 *
 * The flow takes product details, product images, and a customer review image as input.
 * It generates a prompt for an LLM to assess if the review image violates any content policies.
 *
 * @interface GenerateModerationPromptInput - The input type for the generateModerationPrompt function.
 * @interface GenerateModerationPromptOutput - The output type for the generateModerationPrompt function.
 * @function generateModerationPrompt - A function that handles the prompt generation process.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateModerationPromptInputSchema = z.object({
  productDetails: z.string().describe('Details of the product purchased.'),
  productImages: z
    .array(z.string())
    .describe(
      'Array of product images as data URIs that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
    ),
  customerReviewImage: z
    .string()
    .describe(
      'Customer review image as a data URI that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
    ),
});

export type GenerateModerationPromptInput = z.infer<
  typeof GenerateModerationPromptInputSchema
>;

const GenerateModerationPromptOutputSchema = z.object({
  prompt: z.string().describe('The generated moderation prompt.'),
});

export type GenerateModerationPromptOutput = z.infer<
  typeof GenerateModerationPromptOutputSchema
>;

export async function generateModerationPrompt(
  input: GenerateModerationPromptInput
): Promise<GenerateModerationPromptOutput> {
  return generateModerationPromptFlow(input);
}

const moderationPrompt = ai.definePrompt({
  name: 'moderationPrompt',
  input: {schema: GenerateModerationPromptInputSchema},
  output: {schema: GenerateModerationPromptOutputSchema},
  prompt: `You are an agent who moderates images given by customers on an Indian ecommerce platform. Customers provide photos along with review after purchasing a product. You take product details, product images and the image given by the customer as an input and do the following checks before either approving or rejecting the image for showing on the website.

Image should not contain profane/abusive content
Image doesn't match the product purchased
Image doesn't match the brand of the product purchased
Image lacks focus on the product purchased
Image should not be a screenshot
Image should not be of poor quality
Image should not be blurred
Image should not be Incomplete or cropped
Image should not contain personal or sensitive information
Image should not contain reference to other platforms or retailers
Image should not contains service related feedback (about shipment) Ex: fake or damaged product received
There should not be any error in opening image

Here are the product details: {{{productDetails}}}

Here are the product images:
{{#each productImages}}
  {{media url=this}}
{{/each}}

Here is the customer review image: {{media url=customerReviewImage}}

Based on the above checks, decide on whether to approve or reject the image provided by the customer. Provide a detailed explanation for your decision.
`,
});

const generateModerationPromptFlow = ai.defineFlow(
  {
    name: 'generateModerationPromptFlow',
    inputSchema: GenerateModerationPromptInputSchema,
    outputSchema: GenerateModerationPromptOutputSchema,
  },
  async input => {
    const {output} = await moderationPrompt(input);
    return output!;
  }
);
