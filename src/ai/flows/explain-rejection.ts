// This is an AI-generated file. Do not edit directly.
'use server';
/**
 * @fileOverview Explains the reasons for rejecting a customer-submitted image based on identified rule violations.
 *
 * - explainImageRejection - A function that takes image, product details, product images and identified violations as input and provides detailed explanations for each potential violation.
 * - ExplainImageRejectionInput - The input type for the explainImageRejection function.
 * - ExplainImageRejectionOutput - The return type for the explainImageRejection function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainImageRejectionInputSchema = z.object({
  productDetails: z.string().describe('Details of the product purchased.'),
  productImagesDataUris: z
    .array(z.string())
    .describe(
      'Array of product images as data URIs that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
    ),
  customerReviewImageDataUri: z
    .string()
    .describe(
      'The customer review image as a data URI that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
    ),
  identifiedViolations: z
    .array(z.string())
    .describe('Array of identified rule violations.'),
});

export type ExplainImageRejectionInput = z.infer<
  typeof ExplainImageRejectionInputSchema
>;

const ExplainImageRejectionOutputSchema = z.object({
  explanations: z
    .array(z.string())
    .describe('Detailed explanations for each identified rule violation.'),
});

export type ExplainImageRejectionOutput = z.infer<
  typeof ExplainImageRejectionOutputSchema
>;

export async function explainImageRejection(
  input: ExplainImageRejectionInput
): Promise<ExplainImageRejectionOutput> {
  return explainImageRejectionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainImageRejectionPrompt',
  input: {schema: ExplainImageRejectionInputSchema},
  output: {schema: ExplainImageRejectionOutputSchema},
  prompt: `You are an expert moderator for an Indian e-commerce platform.
  You need to provide detailed explanations for each potential rule violation identified in a customer-submitted image.

  Product Details: {{{productDetails}}}
  Product Images: {{#each productImagesDataUris}}{{media url=this}}{{/each}}
  Customer Review Image: {{media url=customerReviewImageDataUri}}

  Identified Violations:
  {{#each identifiedViolations}}
  - {{{this}}}
  {{/each}}

  Provide detailed explanations for each identified violation, including the reasoning behind the flag and confidence scores (if available).
  Format the output as an array of strings, where each string is an explanation for a specific violation.
  `,
});

const explainImageRejectionFlow = ai.defineFlow(
  {
    name: 'explainImageRejectionFlow',
    inputSchema: ExplainImageRejectionInputSchema,
    outputSchema: ExplainImageRejectionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
