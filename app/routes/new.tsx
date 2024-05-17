import { redirect, type LoaderFunctionArgs } from '@remix-run/cloudflare'
import { useFetcher } from '@remix-run/react';

export const loader = async ({request, context}: LoaderFunctionArgs) => {
	// const host = context.URL_API;
	const url = new URL(request.url);
	// const fetcher = useFetcher();
	const roomName = url.searchParams.get('room')
	if(!roomName)
		return redirect('/set-username');

	// const data = await fetcher.submit({name: 'aaa'},{ method: "POST", encType: "application/json", action: `${host}/trxcall`})
	// console.log('data', data)
	// return data;
	return redirect('/' + roomName.toString().replace(/ /g, '-'))
}
