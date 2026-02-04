export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { imageData, mediaType } = req.body;
        
        const API_KEY = process.env.GOOGLE_API_KEY;
        
        if (!API_KEY) {
            return res.status(500).json({ error: 'No API key' });
        }
        
        // Updated API endpoint - v1 instead of v1beta, and gemini-1.5-flash-latest
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                inline_data: {
                                    mime_type: mediaType,
                                    data: imageData
                                }
                            },
                            {
                                text: 'Analyze this photo and rate the person\'s attractiveness on a scale of 1-10. Respond ONLY with a JSON object in this exact format: {"score": <number>}. No other text.'
                            }
                        ]
                    }]
                })
            }
        );

        const text = await response.text();
        
        if (!response.ok) {
            console.error('API Error:', text);
            return res.status(500).json({ error: text });
        }
        
        const data = JSON.parse(text);
        const aiText = data.candidates[0].content.parts[0].text.trim();
        const cleanText = aiText.replace(/```json|```/g, '').trim();
        const result = JSON.parse(cleanText);
        
        return res.status(200).json({ score: result.score });
        
    } catch (error) {
        console.error('ERROR:', error.message);
        return res.status(500).json({ error: error.message });
    }
}