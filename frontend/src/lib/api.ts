const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3001';

export type Product = {
  id: string;
  name: string;
  description?: string;
  price: number | string;
};

export type ProductPayload = {
  name: string;
  description?: string;
  price: number;
};

export type ReportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type Report = {
  id: string;
  requestedByUserId: string;
  status: ReportStatus;
  fileName?: string;
  generatedAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export async function loginRequest(
  email: string,
  password: string,
): Promise<{ accessToken: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('Invalid credentials');
  }

  return response.json() as Promise<{ accessToken: string }>;
}

export async function registerRequest(
  email: string,
  password: string,
): Promise<{ accessToken: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('Register failed');
  }

  return response.json() as Promise<{ accessToken: string }>;
}

export async function getProducts(params: {
  token: string;
  page: number;
  limit: number;
}): Promise<Product[]> {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });

  const response = await fetch(`${API_BASE_URL}/products?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${params.token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to load products');
  }

  return response.json() as Promise<Product[]>;
}

export async function deleteProduct(params: {
  token: string;
  productId: string;
}): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/products/${params.productId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${params.token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete product');
  }
}

export async function getProductById(params: {
  token: string;
  productId: string;
}): Promise<Product> {
  const response = await fetch(`${API_BASE_URL}/products/${params.productId}`, {
    headers: {
      Authorization: `Bearer ${params.token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to load product');
  }

  return response.json() as Promise<Product>;
}

export async function createProduct(params: {
  token: string;
  payload: ProductPayload;
}): Promise<Product> {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params.payload),
  });

  if (!response.ok) {
    throw new Error('Failed to create product');
  }

  return response.json() as Promise<Product>;
}

export function getProductAnalysisStreamUrl(productId: string, token: string): string {
  const url = new URL(`${API_BASE_URL}/ai/stream-analysis/${productId}`);
  url.searchParams.set('token', token);
  return url.toString();
}

export async function enrichProductDescription(params: {
  token: string;
  productId: string;
}): Promise<{ message: string; jobId: string }> {
  const response = await fetch(
    `${API_BASE_URL}/products/${params.productId}/enrich-description`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to queue description enrichment');
  }

  return response.json() as Promise<{ message: string; jobId: string }>;
}

export async function updateProduct(params: {
  token: string;
  productId: string;
  payload: ProductPayload;
}): Promise<Product> {
  const response = await fetch(`${API_BASE_URL}/products/${params.productId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${params.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params.payload),
  });

  if (!response.ok) {
    throw new Error('Failed to update product');
  }

  return response.json() as Promise<Product>;
}

export async function generateReport(params: {
  token: string;
}): Promise<{ reportId: string; jobId: string }> {
  const response = await fetch(`${API_BASE_URL}/reports/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to queue report generation');
  }

  return response.json() as Promise<{ reportId: string; jobId: string }>;
}

export async function getReport(params: { token: string; reportId: string }): Promise<Report> {
  const response = await fetch(`${API_BASE_URL}/reports/${params.reportId}`, {
    headers: {
      Authorization: `Bearer ${params.token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch report status');
  }

  return response.json() as Promise<Report>;
}

export async function downloadReport(params: { token: string; reportId: string }): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/reports/${params.reportId}/download`, {
    headers: {
      Authorization: `Bearer ${params.token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to download report');
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') ?? '';
  const fileNameMatch = disposition.match(/filename="(.+)"/);
  const fileName = fileNameMatch?.[1] ?? `report-${params.reportId}.csv`;

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}
