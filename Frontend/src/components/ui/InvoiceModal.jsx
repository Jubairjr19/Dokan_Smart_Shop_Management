import { Printer } from 'lucide-react'
import Button from './Button.jsx'
import Modal from './Modal.jsx'
import { LogoMark } from './Logo.jsx'
import { useStore } from '../../context/StoreContext.jsx'
import { formatDateTime, number, taka } from '../../lib/format.js'

function Row({ label, value, strong }) {
  return (
    <div className={`flex justify-between gap-4 py-1 ${strong ? 'text-[15px] font-bold text-frost' : 'text-[13.5px] text-frost-soft'}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

/** The digital invoice from FR-04. Printing uses the print styles in index.css. */
export default function InvoiceModal({ sale, onClose }) {
  const { settings } = useStore()
  return (
    <Modal
      title={`Invoice ${sale.id}`}
      subtitle={formatDateTime(sale.date)}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" icon={Printer} onClick={() => window.print()}>
            Print Invoice
          </Button>
        </>
      }
    >
      <div id="invoice-print">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <LogoMark className="no-print h-11 w-11" />
            <div>
              <p className="text-[15px] font-bold text-frost">{settings.shop.name}</p>
              <p className="text-xs text-frost-muted">{settings.shop.address}</p>
              <p className="text-xs text-frost-muted">{settings.shop.phone}</p>
            </div>
          </div>
          <div className="text-right text-[13px]">
            <p className="eyebrow">Billed to</p>
            <p className="mt-1 font-semibold text-frost">{sale.customer}</p>
            <p className="text-xs text-frost-muted">Payment: {sale.method}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table mt-2">
            <thead>
              <tr>
                <th scope="col" className="!pl-0">
                  Item
                </th>
                <th scope="col" className="num">
                  Qty
                </th>
                <th scope="col" className="num">
                  Price
                </th>
                <th scope="col" className="num !pr-0">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, i) => (
                <tr key={`${item.name}-${i}`}>
                  <td className="!pl-0 font-semibold text-frost">{item.name}</td>
                  <td className="num">{number(item.qty)}</td>
                  <td className="num">{taka(item.price)}</td>
                  <td className="num !pr-0">{taka(item.qty * item.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ml-auto mt-3 max-w-[260px] border-t border-white/10 pt-3">
          <Row label="Subtotal" value={taka(sale.subtotal)} />
          {sale.discount > 0 && <Row label="Discount" value={`-${taka(sale.discount)}`} />}
          <Row label="Total" value={taka(sale.total)} strong />
          <Row label="Paid" value={taka(sale.paid)} />
          {sale.due > 0 && <Row label="Balance due" value={taka(sale.due)} strong />}
        </div>
        <p className="mt-5 text-center text-xs text-frost-muted">Thank you for shopping with us.</p>
      </div>
    </Modal>
  )
}
