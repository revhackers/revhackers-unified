declare module 'aws4fetch' {
  export class AwsClient {
    constructor(options: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
      region?: string;
      service?: string;
    });
    fetch(input: string | URL | Request, init?: RequestInit): Promise<Response>;
  }
}
