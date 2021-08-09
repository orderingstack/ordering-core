export function handleAPIError(error: any) {
    const { status, data } = error.response;
    switch (status) {
      case 400:
        console.log('Error: invalid request');
        break;
      case 401:
        console.log('Error: not authenticated');
        break;
      case 500:
        console.log('Error: server problems');
        break;
    }
    if (data) console.log(data);
    throw error;
  }