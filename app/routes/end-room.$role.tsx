import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare'
import { Link, useLoaderData } from '@remix-run/react'
import getDoctorToken, {
	removeDoctorToken,
} from '~/utils/getDoctorToken.server'
// import DataApi from '~/api/dataApi.server'
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const url = new URL(request.url)
	let isfull = url.searchParams.get('isfull')
	let doctorToken = await getDoctorToken(request)
	if (doctorToken) {
		return removeDoctorToken(request, '/end-room/agent')
	}
	return json({ isfull, params })
}

export default function EndRoom() {
	const { params } = useLoaderData<typeof loader>()
	console.log(params)
	return (
			<div className="flex flex-col items-center justify-center min-h-screen p-6 bg-login">
			<div className="w-full max-w-md space-y-8 text-center">
				<div className="bg-kemenkes box-logo mx-auto"></div>

				<h1 className="text-3xl font-bold text-blue">
					Sesi konseling berakhir
				</h1>

				{params.role === 'client' && (
					<div className="flex flex-col items-center">
						<p className="text-blue text-lg mb-6">
							Kami harap kamu sudah merasa terbantu setelah sesi ini. Kamu bisa
							menghubungi konselor kami melalui WhatsApp jika membutuhkan
							bantuan lebih lanjut.
						</p>

						<a
							href="https://wa.me/1XXXXXXXXXX"
							target="_blank"
							rel="noopener noreferrer"
							className="btn-link bg-blue text-white py-2 px-4 rounded-full inline-flex items-center justify-center hover:bg-blue-600 transition duration-300"
						>
							<i className="fa fa-whatsapp mr-2"></i> Hubungi via WhatsApp
						</a>

						<Link
							to="/set-username"
							className="mt-4 inline-block text-blue hover:underline"
						>
							&larr; Kembali ke beranda
						</Link>
					</div>
				)}
			</div>
		</div>
	)
}
