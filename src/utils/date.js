export const parseDate = (date) => {
   return (new Date(date).toJSON()).split('T')[0]
}