
import React from 'react';
import { Sale } from '../types';

interface ReceiptProps {
  sale: Sale;
}

export const Receipt: React.FC<ReceiptProps> = ({ sale }) => {
  return (
    <div className="receipt-container bg-white p-6 font-mono text-[11px] w-72 mx-auto shadow-lg relative border-t-8 border-stone-800 text-stone-900 leading-tight">
      {/* Decorative serrated edge effect (simulated) */}
      <div className="absolute -bottom-2 left-0 w-full h-2 flex overflow-hidden opacity-20 no-print">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="w-4 h-4 bg-stone-400 rotate-45 transform -translate-y-2 shrink-0"></div>
        ))}
      </div>

      <div className="text-center mb-4">
        <h2 className="text-sm font-black uppercase tracking-tighter border-b-2 border-stone-900 pb-1 mb-2">ECFOP BAKERY</h2>
        <p className="font-bold">S.M.A.R.T. POS SYSTEM</p>
        <p>Via delle Farine, 12 - 00100 ROMA</p>
        <p>P.IVA: IT 01234567890</p>
        <p>TEL: 06 1234567</p>
        <div className="border-b border-dashed border-stone-300 my-3"></div>
        <p className="font-black text-xs">DOCUMENTO COMMERCIALE</p>
        <p className="font-bold">di vendita o prestazione</p>
      </div>

      <div className="space-y-2 mb-4">
        {sale.items.map((item) => {
          const itemPrice = (item.basePrice + (item.variantSelections?.size?.priceDelta || 0)) * item.quantity;
          return (
            <div key={item.id} className="flex flex-col">
              <div className="flex justify-between font-black uppercase">
                <span className="flex-1 mr-2">{item.name.substring(0, 20)}</span>
                <span>{itemPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[9px] text-stone-500 font-bold italic pl-2">
                <span>{item.quantity.toFixed(2)} {item.productId.startsWith('p') && !item.productId.includes('1') ? 'pz' : 'kg'} x {item.basePrice.toFixed(2)} €/u</span>
                <span>IVA {item.vatRate}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-b-2 border-stone-900 my-2"></div>

      <div className="space-y-1">
        {sale.discountAmount && sale.discountAmount > 0 && (
          <div className="flex justify-between text-[10px] font-bold text-stone-500 italic mb-1">
            <span>SCONTO APPLICATO</span>
            <span>-€{sale.discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-black">
          <span>TOTALE COMPLESSIVO</span>
          <span>€{sale.total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold mt-1">
          <span>di cui IVA</span>
          <span>€{sale.vatTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="border-b border-dashed border-stone-300 my-3"></div>

      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between">
          <span className="font-bold uppercase italic">Pagamento {sale.paymentMethod}</span>
          <span className="font-black">€{sale.total.toFixed(2)}</span>
        </div>
        {sale.paymentMethod === 'Contanti' && sale.amountPaid && (
          <>
            <div className="flex justify-between opacity-70">
              <span>Importo Ricevuto</span>
              <span>€{sale.amountPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-black border-t border-stone-100 pt-1 mt-1">
              <span>RESTO</span>
              <span>€{sale.changeGiven?.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 pt-2 border-t border-stone-200">
        <p className="font-black text-[9px] mb-1">DETTAGLIO IVA</p>
        <table className="w-full text-[9px]">
          <thead>
            <tr className="text-left border-b border-stone-100">
              <th>ALIQ.</th>
              <th>IMPONIBILE</th>
              <th>IMPOSTA</th>
            </tr>
          </thead>
          <tbody>
            {sale.vatBreakdown.map((vb) => (
              <tr key={vb.rate} className="font-bold">
                <td>{vb.rate}%</td>
                <td>{vb.taxable.toFixed(2)}</td>
                <td>{vb.vatAmount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-center border-t border-dashed border-stone-300 pt-4">
        <div className="flex justify-between text-[9px] font-bold px-1 mb-2">
          <span>{sale.timestamp.toLocaleDateString('it-IT')}</span>
          <span>{sale.timestamp.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <p className="text-[9px] font-black uppercase tracking-widest">N. DOC. {String(sale.receiptNumber).padStart(4, '0')}</p>
        <p className="text-[9px] font-bold mt-1 opacity-60 italic">Operatore: {sale.operator}</p>
        
        {/* Mock barcode */}
        <div className="mt-4 flex flex-col items-center opacity-80">
          <div className="flex space-x-0.5 h-8">
            {[...Array(30)].map((_, i) => (
              <div key={i} className={`h-full ${Math.random() > 0.5 ? 'w-0.5 bg-stone-900' : 'w-[1px] bg-stone-900'} ${Math.random() > 0.8 ? 'mr-0.5' : ''}`}></div>
            ))}
          </div>
          <p className="text-[7px] font-bold mt-1 tracking-[0.3em]">RT 0123456789ABCDEF</p>
        </div>

        <p className="mt-4 font-black italic text-[10px]">GRAZIE E ARRIVEDERCI</p>
      </div>
    </div>
  );
};
