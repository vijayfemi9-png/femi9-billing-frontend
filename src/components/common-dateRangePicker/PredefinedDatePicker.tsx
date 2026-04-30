import { DateRangePicker } from 'react-bootstrap-daterangepicker';
import 'bootstrap-daterangepicker/daterangepicker.css';
import { useState, useRef } from 'react';
import moment from 'moment';
import api from '../../api/axios';

(window as any).moment = moment;

function formatDate(date: Date) {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: '2-digit',
  });
}

export default function PredefinedDatePicker() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const initialSettings = {
    startDate: moment(startOfToday),
    endDate: moment(endOfToday),
    ranges: {
      'Last 30 Days': [
        moment(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0)),
        moment(endOfToday),
      ],
      'Last 7 Days': [
        moment(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0)),
        moment(endOfToday),
      ],
      'Last Month': [
        moment(startOfLastMonth),
        moment(endOfLastMonth),
      ],
      'This Month': [
        moment(startOfMonth),
        moment(endOfMonth),
      ],
      'Today': [
        moment(startOfToday),
        moment(endOfToday),
      ],
      'Yesterday': [
        moment(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0)),
        moment(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999)),
      ],
    },
    timePicker: false,
    locale: {
      format: 'DD MMMM YY',
    },
  };

  const [displayValue, setDisplayValue] = useState(
    `${formatDate(startOfToday)} - ${formatDate(endOfToday)}`
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const handleShow = (_event: any, picker: any) => {
    setDisplayValue(
      `${formatDate(picker.startDate.toDate())} - ${formatDate(picker.endDate.toDate())}`
    );
  };

  // ✅ Laravel API call
  const handleApply = async (_event: any, picker: any) => {
    const start = picker.startDate.toDate();
    const end = picker.endDate.toDate();

    setDisplayValue(`${formatDate(start)} - ${formatDate(end)}`);

    try {
      const response = await api.post('/reports', {
        start_date: start.toISOString(),
        end_date: end.toISOString(),
      });

      console.log('✅ Laravel response:', response.data);
      // இங்க response.data use பண்ணி dashboard update பண்ணலாம்

    } catch (error) {
      console.error('❌ API Error:', error);
    }
  };

  return (
    <>
      <style>{`
        .date-range-btn {
          transition: all 0.2s ease !important;
        }
        .date-range-btn:hover {
          background: #fff7f6 !important;
          border-color: #fde0dd !important;
          box-shadow: 0 2px 6px rgba(228, 31, 7, 0.07) !important;
        }
        .date-range-btn:hover .ti-calendar,
        .date-range-btn:hover input {
          color: #e41f07 !important;
        }
      `}</style>
      <DateRangePicker
        initialSettings={initialSettings as any}
        onApply={handleApply}
        onShow={handleShow}
      >
        <div className="date-range-btn btn btn-outline-light bg-white shadow-sm d-flex align-items-center gap-2 px-3" style={{ height: 38, borderRadius: 6, cursor: 'pointer' }}>
          <input
            ref={inputRef}
            type="text"
            className="reportrange-picker-field text-dark border-0 shadow-none bg-transparent p-0 fs-14 cursor-pointer"
            style={{ width: 170, pointerEvents: 'none' }}
            value={displayValue}
            readOnly
          />
          <i className="ti ti-calendar text-dark fs-16" />
        </div>
      </DateRangePicker>
    </>
  );
}
