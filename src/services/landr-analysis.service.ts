import { openai } from './openai.service.js';

interface VideoMetadata {
  platform: 'youtube' | 'instagram' | 'tiktok';
  title: string;
  transcript: string;
  url: string;
  duration?: number;
}

interface LANDRAnalysis {
  hookStrategy: string;
  engagementTactics: string[];
  contentStructure: string;
  adaptationSuggestions: string;
  contentIdeas: string[];
}

export const analyzeForLANDR = async (metadata: VideoMetadata): Promise<LANDRAnalysis> => {
  const systemPrompt = `You are a content strategist analyzing social media videos for LANDR, a music production platform.

LANDR's brand voice:
- Educational yet approachable
- Focused on music production, mixing, mastering, and distribution
- Empowers creators at all skill levels
- Technical but not intimidating
- Community-driven and supportive

Your task is to analyze the provided video transcript and identify strategies that could be adapted for LANDR's content.`;

  const userPrompt = `Analyze this ${metadata.platform} video:

Title: ${metadata.title}
URL: ${metadata.url}
${metadata.duration ? `Duration: ${Math.floor(metadata.duration / 60)}m ${metadata.duration % 60}s` : ''}

TRANSCRIPT:
${metadata.transcript}

Please provide a detailed analysis with the following structure:

1. HOOK STRATEGY (first 3 seconds/lines):
   - What specific technique does the creator use to grab attention?
   - Why is it effective for their audience?
   - Example of the exact opening

2. ENGAGEMENT TACTICS:
   - List 3-5 specific tactics used throughout the video
   - Consider pacing, storytelling, visual cues, calls-to-action, etc.

3. CONTENT STRUCTURE:
   - Break down how the video is organized
   - Identify the narrative arc or educational flow
   - Note any patterns or frameworks used

4. ADAPTATION FOR LANDR:
   - How could these strategies be adapted for music production content?
   - What elements align with LANDR's brand voice?
   - What would need to be modified?

5. 3 SPECIFIC CONTENT IDEAS:
   - Generate 3 concrete video ideas for LANDR based on this approach
   - Each idea should include: topic, hook concept, and key takeaway
   - Ensure they're relevant to music production/LANDR's services

Format your response as JSON with these exact keys:
{
  "hookStrategy": "detailed analysis of the hook",
  "engagementTactics": ["tactic 1", "tactic 2", "tactic 3", ...],
  "contentStructure": "detailed breakdown of structure",
  "adaptationSuggestions": "how to adapt for LANDR",
  "contentIdeas": [
    "Idea 1: [Title] - Hook: [hook concept] - Takeaway: [key point]",
    "Idea 2: [Title] - Hook: [hook concept] - Takeaway: [key point]",
    "Idea 3: [Title] - Hook: [hook concept] - Takeaway: [key point]"
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    const analysis = JSON.parse(content) as LANDRAnalysis;

    return analysis;
  } catch (error) {
    console.error('LANDR analysis error:', error);
    throw new Error('Failed to generate LANDR analysis');
  }
};
