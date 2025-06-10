import { config } from 'dotenv';
config();

import '@/ai/flows/generate-moderation-prompt.ts';
import '@/ai/flows/moderate-review-image.ts';
import '@/ai/flows/explain-rejection.ts';