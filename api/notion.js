export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle image proxy requests
  if (req.method === 'GET' && req.query.proxyImage) {
    const imageUrl = req.query.proxyImage;
    const apiKey = req.query.apiKey;

    if (!imageUrl || !apiKey) {
      return res.status(400).json({ error: 'Missing image URL or API key' });
    }

    try {
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        }
      });

      if (!imageResponse.ok) {
        throw new Error('Failed to fetch image');
      }

      const contentType = imageResponse.headers.get('content-type');
      const imageBuffer = await imageResponse.arrayBuffer();

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.send(Buffer.from(imageBuffer));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, databaseId, apiKey, pageId, order, date } = req.body;

  if (!apiKey || !databaseId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    if (action === 'query') {
      // Query the database
      const response = await fetch(
        `https://api.notion.com/v1/databases/${databaseId}/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sorts: [{ property: 'Order', direction: 'ascending' }]
          })
        }
      );

      const data = await response.json();
      return res.status(200).json(data);

    } else if (action === 'update') {
      console.log('UPDATE ACTION - Full request body:', JSON.stringify(req.body, null, 2));
      
      // Build the properties object
      const properties = {
        Order: {
          number: order
        }
      };
      
      // Add Date property if provided and valid
      if (date && date !== null && date !== 'null' && date !== '') {
        console.log('Adding Date property with value:', date);
        properties.Date = {
          date: {
            start: date
          }
        };
      } else {
        console.log('Skipping Date property - date value is:', date);
      }
      
      console.log('Final properties object:', JSON.stringify(properties, null, 2));
      
      // Update the page
      try {
        const response = await fetch(
          `https://api.notion.com/v1/pages/${pageId}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              properties: properties
            })
          }
        );

        const data = await response.json();
        
        console.log('Notion API response status:', response.status);
        console.log('Notion API response data:', JSON.stringify(data, null, 2));
        
        if (!response.ok) {
          console.error('Notion API Error Response:', data);
          return res.status(response.status).json({ 
            error: 'Notion API error',
            message: data.message,
            details: data 
          });
        }
        
        console.log('✅ Update successful for page:', pageId);
        return res.status(200).json(data);
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        return res.status(500).json({ 
          error: 'Failed to update page',
          message: fetchError.message 
        });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

if (body.action === 'updateText') {
  const { pageId, textType, textValue } = body;
  
  const propertyName = textType === 'caption' ? 'Caption' : 'Hashtags';
  
  await notion.pages.update({
    page_id: pageId,
    properties: {
      [propertyName]: {
        rich_text: [{
          text: { content: textValue }
        }]
      }
    }
  });
  
  return { success: true };
}
