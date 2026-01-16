try {
    console.log('Starting Gemini API call...');
    
    const response = await fetch(// Vercel Serverless Function for Run-Walk Analysis
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body;
  
  if (!image) {
    return res.status(400).json({ error: 'No image provided' });
  }

  // Check if API key is configured
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `You are a pace graph analyzer. Analyze this running pace graph from Zepp Life (MI Band).

CRITICAL: You must respond with ONLY a valid JSON object. No explanatory text before or after. No markdown. Just pure JSON.

Tasks:
1. Extract all pace data points from the graph (time vs pace)
2. Intelligently determine the threshold pace that separates running from walking by analyzing the distribution of pace values (look for bimodal distribution or natural clustering)
3. Calculate the run-to-walk ratio
4. Calculate total running time, walking time, running distance, and walking distance

Respond with ONLY this JSON structure (no other text):
{
  "ratio": "3:1",
  "runningPercentage": 75,
  "walkingPercentage": 25,
  "runningTime": "20m 45s",
  "walkingTime": "6m 52s",
  "runningDistance": "3.2 km",
  "walkingDistance": "0.8 km",
  "thresholdPace": "7:30 min/km"
}`
              },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: image
                }
              }
            ]
          }]
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'API error occurred');
    }

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from API');
    }

    const resultText = data.candidates[0].content.parts[0].text;
    console.log('Raw Gemini response:', resultText);
    
    let cleanedText = resultText.trim();
    
    // Remove markdown code blocks
    cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Try to extract JSON if it's embedded in text
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }
    
    console.log('Cleaned text:', cleanedText);
    
    const parsedResults = JSON.parse(cleanedText);
    
    return res.status(200).json(parsedResults);
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ error: error.message || 'Failed to analyze image' });
  }
}
