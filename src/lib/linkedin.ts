/**
 * LinkedIn REST API and OAuth 2.0 Integration Client
 */

export interface LinkedInUserInfo {
  sub: string; // The Person URN identifier (e.g. '782910...')
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
}

export interface LinkedInPostResult {
  success: boolean;
  postUrn?: string;
  postUrl?: string;
  error?: string;
}

/**
 * Generates the LinkedIn OAuth authorization URL.
 */
export function getLinkedInAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    throw new Error('LINKEDIN_CLIENT_ID is not configured in environment variables');
  }

  // Scopes for OpenID Connect + Share on LinkedIn
  const scope = encodeURIComponent('openid profile email w_member_social');
  const encodedRedirect = encodeURIComponent(redirectUri);
  const encodedState = encodeURIComponent(state);

  return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodedRedirect}&scope=${scope}&state=${encodedState}`;
}

/**
 * Exchanges the authorization code for an OAuth access token.
 */
export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET is missing');
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Failed to exchange authorization code');
  }

  return data;
}

/**
 * Fetches user profile data using OpenID Connect userinfo endpoint.
 */
export async function fetchLinkedInUserInfo(accessToken: string): Promise<LinkedInUserInfo> {
  const response = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch LinkedIn user info: ${errorText}`);
  }

  return response.json();
}

/**
 * Publishes a text post (with optional article / media link) to LinkedIn.
 * Uses LinkedIn's standard ugcPosts API.
 */
export async function publishToLinkedIn(
  accessToken: string,
  authorUrn: string,
  text: string
): Promise<LinkedInPostResult> {
  try {
    // Ensure authorUrn has person format: urn:li:person:...
    const formattedAuthor = authorUrn.startsWith('urn:li:person:') 
      ? authorUrn 
      : `urn:li:person:${authorUrn}`;

    const requestBody = {
      author: formattedAuthor,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text,
          },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('LinkedIn API Error:', data);
      return {
        success: false,
        error: data.message || `LinkedIn API error (${response.status})`,
      };
    }

    const postUrn = data.id || '';
    // Format live LinkedIn URL if URN is present
    const cleanId = postUrn.replace('urn:li:ugcPost:', '').replace('urn:li:share:', '');
    const postUrl = cleanId ? `https://www.linkedin.com/feed/update/urn:li:ugcPost:${cleanId}/` : undefined;

    return {
      success: true,
      postUrn,
      postUrl,
    };
  } catch (err: any) {
    console.error('publishToLinkedIn Exception:', err);
    return {
      success: false,
      error: err.message || 'Failed to communicate with LinkedIn API',
    };
  }
}
