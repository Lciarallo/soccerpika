const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export const formatPrice = (value: number) => BRL.format(value);

/** Parcelamento em até 12x sem juros, como a loja original exibe. */
export const installment = (value: number, times = 12) => ({
  times,
  value: BRL.format(value / times),
});
