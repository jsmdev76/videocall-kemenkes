import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/cloudflare'
import {
	Form,
	useActionData,
	useLoaderData,
	useNavigation,
} from '@remix-run/react'
import { useEffect, useState } from 'react'
import { Button } from '~/components/Button'
import { Input } from '~/components/Input'
import { setUsername } from '~/utils/getUsername.server'

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
	const url = new URL(request.url)
	const username = url.searchParams.get('username')
	const opt = url.searchParams.get('opt')
	return json({ username, opt })
}

interface ActionData {
	success?: boolean
	message?: string
}

export const action = async ({ request, context }: ActionFunctionArgs) => {
	const url = new URL(request.url)
	const formData = await request.formData()
	const formType = formData.get('formType') as string // Field untuk menentukan jenis formulir
	const clientName = formData.get('clientName') as string | undefined
	const email = formData.get('email') as string | undefined
	const phone = formData.get('phone') as string | undefined
	const message = formData.get('message') as string | undefined
	const callbackTime = formData.get('callbackTime') as string | undefined
	const username = formData.get('username') as string | undefined
	const latitude = formData.get('latitude') as string | undefined
	const longitude = formData.get('longitude') as string | undefined
	const opt = formData.get('opt') as string | undefined

	const errors: { [key: string]: string } = {}

	if (formType === 'consultationRequest') {
		if (!clientName) errors.clientName = 'Nama lengkap diperlukan'
		if (!email) errors.email = 'Alamat email diperlukan'
		if (!phone) errors.phone = 'Nomor telepon diperlukan'

		if (Object.keys(errors).length > 0) {
			return json<ActionData>({
				success: false,
				message: 'Form tidak valid. Silakan periksa kembali.',
			})
		}

		const host = context.URL_API
		const response = await fetch(`${host}/contact`, {
			method: 'post',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				name: clientName,
				email,
				phone,
				message,
				callbackTime,
			}),
		})

		const payload: any = await response.json()

		if (!response.ok) {
			return json<ActionData>({
				success: false,
				message: payload.message || 'Terjadi kesalahan, silakan coba lagi.',
			})
		}

		return json<ActionData>({
			success: true,
			message: 'Permintaan konsultasi berhasil dikirim!',
		})
	} else if (formType === 'startConsultation') {
		if (!username) errors.username = 'Nama pengguna diperlukan'

		if (Object.keys(errors).length > 0) {
			return json<ActionData>({
				success: false,
				message: 'Form tidak valid. Silakan periksa kembali.',
			})
		}

		const host = context.URL_API
		const roomName = crypto.randomUUID().split('-')[0]
		const response = await fetch(`${host}/call/create`, {
			method: 'post',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				'x-api-key': context.API_SECRET_KEY as string,
			},
			body: JSON.stringify({
				url: `${url.origin}/${roomName}/room`,
				roomId: roomName,
				clientName: username,
				latitude: latitude,
				longitude: longitude,
				opt: opt,
			}),
		})

		const data: any = await response.json()
		if (data.success) {
			return setUsername(username as string, 'client', request, `/${roomName}`)
		} else {
			return json<ActionData>({
				success: false,
				message: data.message || 'Terjadi kesalahan saat memulai sesi.',
			})
		}
	}

	return json<ActionData>({
		success: false,
		message: 'Tipe formulir tidak dikenal.',
	})
}

export default function SetUsername() {
	const { username, opt } = useLoaderData<typeof loader>()
	const data = useActionData<typeof action>()
	const [latitude, setLatitude] = useState<string>('')
	const [longitude, setLongitude] = useState<string>('')
	const [allowAudio, setAllowAudio] = useState(1)
	const [callStatus, setCallStatus] = useState('idle')
	const [isFull, setIsFull] = useState(false)
	const [showModal, setShowModal] = useState(false)
	const [statusMessage, setStatusMessage] = useState<string | null>(null)

	const navigation = useNavigation()
	useEffect(() => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition((position) => {
				if (position) {
					setLatitude(String(position.coords.latitude))
					setLongitude(String(position.coords.longitude))
				}
			})
		}

		if (navigator.mediaDevices) {
			navigator.mediaDevices
				.getUserMedia({
					video: true,
					audio: true,
				})
				.then((ms) => {
					ms.getTracks().forEach((t) => t.stop())
					setAllowAudio(1)
				})
				.catch(() => {
					setAllowAudio(2)
				})
		}

		if (data?.message) {
			setStatusMessage(data.message)
		}
		if (data?.success) {
			setStatusMessage(data.message as string)
		} else if (data?.success === false) {
			setStatusMessage(data.message as string)
		}

		// if (data?.message === 'No available agent found') {
		//     setShowModal(true);
		// }

		// if (data?.message === "Permintaan konsultasi berhasil dikirim!") {
		// 	setShowModal(false)
		// }
	}, [data, navigation])

	return (
		<div className="grid h-full gap-4 place-content-center bg-login">
			<div className="bg-kemenkes box-logo"></div>
			<h1 className="text-3xl font-bold text-blue">Konsultasi</h1>
			<p className="text-blue">
				Anda akan terhubung ke layanan konseling 24 jam dengan durasi 30 menit
				per sesi. <br />
				Izinkan akses lokasi agar konselor dapat memberikan pelayanan yang
				optimal.{' '}
			</p>
			<Form className="flex items-end gap-4" method="post">
				<input type="hidden" name="formType" value="startConsultation" />
				<div className="grid gap-3">
					<label htmlFor="username" className="text-blue">
						Masukkan nama Anda untuk memulai
					</label>
					<Input
						autoComplete="off"
						autoFocus
						required
						type="text"
						id="username"
						name="username"
						defaultValue={username || ''}
					/>
					<Input type="hidden" id="latitude" name="latitude" value={latitude} />
					<Input
						type="hidden"
						id="longitude"
						name="longitude"
						value={longitude}
					/>
					<Input type="hidden" id="opt" name="opt" value={opt || ""} />
				</div>
				{navigation.state === 'idle' ? (
					<Button className="text-xs bg-blue" type="submit">
						Hubungi Konselor
					</Button>
				) : (
					'Menghubungi Konselor...'
				)}
			</Form>
			{allowAudio === 2 && (
				<div className="text-danger">
					Silahkan aktifkan microphone untuk memulai sesi.
				</div>
			)}
			{statusMessage && (
				<div
					className={`flex flex-col gap-2 text-${data?.success ? 'success' : 'danger'}`}
				>
					{statusMessage}
					{!data?.success && (
						<div>
							<Button
								className="text-xs bg-blue"
								onClick={() => setShowModal(true)}
							>
								Tinggalkan Pesan
							</Button>
						</div>
					)}
				</div>
			)}
			{/* {data?.success ? (
                <h1>Yuhuuu</h1>
            ): (
                <h1>Net Not</h1>
            )} */}
			{showModal && <Modal onClose={() => setShowModal(false)} />}
		</div>
	)
}

function Modal({ onClose }: { onClose: () => void }) {
	const [errors, setErrors] = useState<{ [key: string]: string }>({})
	const [isSuccess, setIsSuccess] = useState<boolean>(false)

	const validateForm = (formData: FormData) => {
		const newErrors: { [key: string]: string } = {}
		const fields = ['clientName', 'email', 'phone', 'message']
		const fieldNames = {
			clientName: 'Nama',
			email: 'Email',
			phone: 'Nomor Telepon',
			message: 'Pesan',
		}
		fields.forEach((field) => {
			if (!formData.get(field)) {
				newErrors[field] =
					`${fieldNames[field as keyof typeof fieldNames]} wajib diisi`
			}
		})
		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		const form = event.currentTarget
		const formData = new FormData(form)
		if (!validateForm(formData)) {
			event.preventDefault()
		} else {
			setIsSuccess(true)
			onClose()
		}
	}

	return (
		<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
			<div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-bold text-gray-800">
						Formulir Permintaan Konsultasi
					</h2>
					<button
						onClick={onClose}
						className="text-gray-600 hover:text-gray-800"
					>
						&times;
					</button>
				</div>
				<p className="text-gray-600 mb-4">
					Mohon maaf tenaga medis belum tersedia untuk saat ini.
				</p>
				<p className="text-gray-600 mb-4">
					Mohon isi formulir di bawah ini. Tim kami akan menghubungi Anda
					secepatnya untuk menjadwalkan sesi konsultasi.
				</p>
				<Form method="post" className="space-y-4" onSubmit={handleSubmit}>
					<input type="hidden" name="formType" value="consultationRequest" />
					<div>
						<label
							htmlFor="client-name"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Nama Lengkap
						</label>
						<Input
							autoComplete="off"
							type="text"
							id="client-name"
							name="clientName"
							placeholder="Masukkan nama lengkap Anda"
							className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
								errors.clientName ? 'border-red-500' : 'border-gray-300'
							}`}
						/>
						{errors.clientName && (
							<p className="mt-1 text-sm text-red-600">{errors.clientName}</p>
						)}
					</div>
					<div>
						<label
							htmlFor="email"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Alamat Email
						</label>
						<Input
							autoComplete="off"
							type="email"
							id="email"
							name="email"
							placeholder="contoh@email.com"
							className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
								errors.email ? 'border-red-500' : 'border-gray-300'
							}`}
						/>
						{errors.email && (
							<p className="mt-1 text-sm text-red-600">{errors.email}</p>
						)}
					</div>
					<div>
						<label
							htmlFor="phone"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Nomor Telepon
						</label>
						<Input
							autoComplete="off"
							type="tel"
							id="phone"
							name="phone"
							placeholder="Contoh: 081234567890"
							className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
								errors.phone ? 'border-red-500' : 'border-gray-300'
							}`}
						/>
						{errors.phone && (
							<p className="mt-1 text-sm text-red-600">{errors.phone}</p>
						)}
					</div>
					<div>
						<label
							htmlFor="callbackTime"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Waktu yang Diinginkan untuk Dihubungi Kembali
						</label>
						<input
							type="datetime-local"
							id="callbackTime"
							name="callbackTime"
							className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
								errors.callbackTime ? 'border-red-500' : 'border-gray-300'
							}`}
						/>
						{errors.callbackTime && (
							<p className="mt-1 text-sm text-red-600">{errors.callbackTime}</p>
						)}
					</div>
					<div>
						<label
							htmlFor="message"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Pesan (opsional)
						</label>
						<textarea
							id="message"
							name="message"
							placeholder="Tuliskan pesan atau pertanyaan Anda di sini"
							className={`w-full px-3 py-2 text-black border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
								errors.message ? 'border-red-500' : 'border-gray-300'
							}`}
							rows={4}
						></textarea>
						{errors.message && (
							<p className="mt-1 text-sm text-red-600">{errors.message}</p>
						)}
					</div>
					{isSuccess ? (
						<Button
							type="submit"
							className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							Tutup
						</Button>
					) : (
						<Button
							type="submit"
							className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							Kirim Permintaan Konsultasi
						</Button>
					)}
				</Form>
			</div>
		</div>
	)
}
