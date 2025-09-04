export const formatDate = (date) => date.toISOString().split('T')[0];

export const getWeekDays = (date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    // Điều chỉnh để tuần bắt đầu từ Thứ Hai (Monday)
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    
    // Tạo một mảng chứa 7 ngày trong tuần
    return Array.from({ length: 7 }).map((_, i) => {
        const newDate = new Date(startOfWeek);
        newDate.setDate(startOfWeek.getDate() + i);
        return newDate;
    });
};

