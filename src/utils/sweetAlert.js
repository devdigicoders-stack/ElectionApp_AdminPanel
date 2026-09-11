import Swal from 'sweetalert2'

/**
 * Modern SweetAlert confirmation dialog for Admin Panel
 * Returns a Promise that resolves to true if user clicks Confirm, false otherwise.
 */
export const confirmDialog = async ({
  title = 'Are you sure?',
  text = 'This action cannot be undone.',
  confirmButtonText = 'Yes, Delete',
  cancelButtonText = 'Cancel',
  icon = 'warning',
  isDestructive = true,
} = {}) => {
  const primaryColor =
    typeof window !== 'undefined'
      ? getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#4f46e5'
      : '#4f46e5'

  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonColor: isDestructive ? '#dc2626' : primaryColor,
    cancelButtonColor: '#9ca3af',
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    focusCancel: true,
    customClass: {
      popup: 'rounded-3xl p-5 shadow-2xl font-sans border border-gray-100',
      title: 'text-base font-bold text-gray-900',
      htmlContainer: 'text-xs text-gray-500 mt-1',
      confirmButton: 'rounded-xl font-bold px-4 py-2.5 text-xs shadow-xs',
      cancelButton: 'rounded-xl font-bold px-4 py-2.5 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 border-0 shadow-xs',
    },
    buttonsStyling: true,
  })

  return result.isConfirmed
}

/**
 * Success Alert Toast/Popup
 */
export const successAlert = (title = 'Success!', text = '') => {
  return Swal.fire({
    title,
    text,
    icon: 'success',
    timer: 2200,
    showConfirmButton: false,
    customClass: {
      popup: 'rounded-3xl p-5 shadow-2xl font-sans border border-gray-100',
      title: 'text-base font-bold text-gray-900',
      htmlContainer: 'text-xs text-gray-500',
    },
  })
}

/**
 * Error Alert Popup
 */
export const errorAlert = (title = 'Error', text = '') => {
  return Swal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonText: 'OK',
    confirmButtonColor: '#dc2626',
    customClass: {
      popup: 'rounded-3xl p-5 shadow-2xl font-sans border border-gray-100',
      title: 'text-base font-bold text-gray-900',
      htmlContainer: 'text-xs text-gray-500',
      confirmButton: 'rounded-xl font-bold px-4 py-2 text-xs shadow-xs',
    },
  })
}

export default Swal
