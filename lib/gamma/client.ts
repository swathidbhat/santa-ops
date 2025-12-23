interface GammaGenerationRequest {
  topic: string;
  style: string;
  numCards: number;
  imageGeneration: {
    enabled: boolean;
    model: string;
  };
  sharing: {
    externalAccess: boolean;
  };
}

interface GammaGenerationResponse {
  id: string;
  gammaUrl: string;
  status: string;
}

export async function generateCard(
  recipientName: string,
  riddle: string
): Promise<string> {
  const apiKey = process.env.GAMMA_API_KEY;
  if (!apiKey) {
    throw new Error("GAMMA_API_KEY environment variable is not set");
  }

  console.log(`[Gamma] Generating card for ${recipientName}`);

  const topic = `Holiday Gift Card for ${recipientName}

${riddle}

🎄 Happy Holidays! 🎁`;

  const requestBody: GammaGenerationRequest = {
    topic,
    style: "festive holiday theme with warm colors",
    numCards: 1,
    imageGeneration: {
      enabled: true,
      model: "nano-banana-pro",
    },
    sharing: {
      externalAccess: true,
    },
  };

  const response = await fetch("https://api.gamma.app/v2/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gamma API error: ${response.status} - ${errorText}`);
  }

  const data: GammaGenerationResponse = await response.json();

  console.log(`[Gamma] Card generated: ${data.gammaUrl}`);

  return data.gammaUrl;
}

