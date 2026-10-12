"""Family A — Loss classification (experiment `adaptive_loss_class`).

Vary ONLY the trigger (plus, for A3/A4, a `required_level` that reads the armed episode's frozen
`st.loss` / `st.price_return`); discount otherwise fixed at 3% off the loss-exit price, reset fixed at
frozen-high 95%. Every configuration is a pure composition of `framework.AdaptiveStrategy` components —
no subclassing, no engine changes.

Trigger definitions (spec, "Shared mechanics fixed in advance"):
- price return of a trade = exit_price / entry_price - 1 (execution prices, interest excluded);
- financing-only loss = net P&L < 0 with exit_price >= entry_price (a price loss always implies a net
  loss, so A1/A2/A4 triggers are strict subsets of A0's);
- A3 dollar bands are on |net P&L| of the losing trade.
"""
from __future__ import annotations


# ---------------------------------------------------------------- triggers

def net_loss_trigger(ctx, trade):
    """A0 (= framework default, kept explicit here): any net loss arms."""
    return trade['profit'] < 0


def price_loss_trigger(ctx, trade):
    """A1 / A4: arms only when the exit price is below the entry price (financing-only losses do not)."""
    return trade['exit_price'] < trade['entry_price']


def material_trigger(threshold):
    """A2: arms only when price return <= -threshold (0.005 / 0.01 / 0.02 / 0.03)."""
    def trigger(ctx, trade):
        return trade['exit_price'] / trade['entry_price'] - 1 <= -threshold
    trigger.__name__ = f'material_trigger_{threshold:g}'
    return trigger


def dollar_band_trigger(floor):
    """A3: arms only when the trade is a net loss of at least `floor` dollars (bands on |net P&L|)."""
    def trigger(ctx, trade):
        return trade['profit'] < 0 and abs(trade['profit']) >= floor
    trigger.__name__ = f'dollar_band_trigger_{floor:g}'
    return trigger


# ---------------------------------------------------------- required levels

def fixed3(ctx, st, i):
    """The verified 3% discount off the frozen loss-exit price."""
    return st.exit_price * 0.97


def bands_a_level(ctx, st, i):
    """A3_bands_a: |net loss| in [$500, $5,000] -> 3% discount; > $5,000 -> 5%. (< $500 never arms.)"""
    return st.exit_price * (1 - (0.05 if abs(st.loss) > 5000.0 else 0.03))


def proportional_level(k):
    """A4: required decline = clip(k * |price return of the losing trade|, 1%, 8%) off the loss exit."""
    def required_level(ctx, st, i):
        decline = min(max(k * abs(st.price_return), 0.01), 0.08)
        return st.exit_price * (1 - decline)
    required_level.__name__ = f'proportional_level_{k:g}'
    return required_level


# ------------------------------------------------------------ configurations

def build_configs(AdaptiveStrategy):
    """{name: factory}; factories close over the frozen component functions above."""
    return {
        'A0_net_loss': lambda: AdaptiveStrategy('A0_net_loss', trigger=net_loss_trigger,
                                                required_level=fixed3),
        'A1_price_loss_only': lambda: AdaptiveStrategy('A1_price_loss_only', trigger=price_loss_trigger,
                                                       required_level=fixed3),
        'A2_material_05': lambda: AdaptiveStrategy('A2_material_05', trigger=material_trigger(0.005),
                                                   required_level=fixed3),
        'A2_material_1': lambda: AdaptiveStrategy('A2_material_1', trigger=material_trigger(0.01),
                                                  required_level=fixed3),
        'A2_material_2': lambda: AdaptiveStrategy('A2_material_2', trigger=material_trigger(0.02),
                                                  required_level=fixed3),
        'A2_material_3': lambda: AdaptiveStrategy('A2_material_3', trigger=material_trigger(0.03),
                                                  required_level=fixed3),
        'A3_bands_a': lambda: AdaptiveStrategy('A3_bands_a', trigger=dollar_band_trigger(500.0),
                                               required_level=bands_a_level),
        'A3_bands_b': lambda: AdaptiveStrategy('A3_bands_b', trigger=dollar_band_trigger(1000.0),
                                               required_level=fixed3),
        'A4_proportional_05': lambda: AdaptiveStrategy('A4_proportional_05', trigger=price_loss_trigger,
                                                       required_level=proportional_level(0.5)),
        'A4_proportional_10': lambda: AdaptiveStrategy('A4_proportional_10', trigger=price_loss_trigger,
                                                       required_level=proportional_level(1.0)),
    }


FAMILY = 'A'

ENTRIES = [
    dict(name='A0_net_loss', family=FAMILY,
         description='Anchor: any net loss (margin interest included) arms; 3% discount off the loss '
                     'exit; frozen-high 95% reset. Identical to REF_lower3 / lower-price-reentry '
                     'B_lower_3pct.',
         params=dict(trigger='net P&L < 0', discount=0.03, reset='close >= 0.95 * frozen ref high'),
         hypothesis='Reproduces the existing 3% strategy trade for trade (calibration anchor). Its '
                    'trigger fires on financing-only losses (net loss with exit >= entry), which arm '
                    'restrictions after sessions where price did NOT fall — e.g. the VGT 2023-01-03 '
                    '-$143 exit that blocked a +$28k baseline winner. Counting those episodes per '
                    'dataset quantifies the false-trigger problem the rest of the family tries to fix.'),
    dict(name='A1_price_loss_only', family=FAMILY,
         description='Arms only when exit_price < entry_price (pure price loss); financing-only losses '
                     'never restrict. Discount/reset as A0.',
         params=dict(trigger='exit_price < entry_price', discount=0.03,
                     reset='close >= 0.95 * frozen ref high'),
         hypothesis='Financing-only losses occur when price went sideways or up during the hold — not '
                    'cascade conditions — so dropping them should recover blocked recovery winners '
                    '(VGT 2023-01 type) at little or no bear-market cost: in 2000-02 cascades nearly '
                    'every loss is a price loss, so A1 should keep A0\'s bear-market protection almost '
                    'unchanged.'),
    dict(name='A2_material_05', family=FAMILY,
         description='Arms only when price return <= -0.5%. Discount/reset as A0.',
         params=dict(trigger='price_return <= -0.005', discount=0.03,
                     reset='close >= 0.95 * frozen ref high'),
         hypothesis='A small materiality floor removes financing-only and hairline price losses '
                    '(round-trip noise) while still restricting after every real decline; should '
                    'behave like A1 with slightly fewer armings and no loss of 2000-02 protection.'),
    dict(name='A2_material_1', family=FAMILY,
         description='Arms only when price return <= -1%. Discount/reset as A0.',
         params=dict(trigger='price_return <= -0.01', discount=0.03,
                     reset='close >= 0.95 * frozen ref high'),
         hypothesis='Same mechanism as A2_material_05 with a wider exemption band. The risk grows with '
                    'the threshold: losses the floor exempts can repeat unrestricted in grinding bears. '
                    'At -1% the exempted trades should still be few and small.'),
    dict(name='A2_material_2', family=FAMILY,
         description='Arms only when price return <= -2%. Discount/reset as A0.',
         params=dict(trigger='price_return <= -0.02', discount=0.03,
                     reset='close >= 0.95 * frozen ref high'),
         hypothesis='At -2% the exemption starts to admit repeated moderate losses (a -1.5% loss can '
                    'recur back-to-back in 2000-02); expect visible bear-window degradation vs A0/A1 '
                    'in exchange for fewer blocked recoveries.'),
    dict(name='A2_material_3', family=FAMILY,
         description='Arms only when price return <= -3%. Discount/reset as A0.',
         params=dict(trigger='price_return <= -0.03', discount=0.03,
                     reset='close >= 0.95 * frozen ref high'),
         hypothesis='The widest floor. Many 15-day loss exits in cascades lose 1-3% of price, so A3% '
                    'should measurably re-open the 2000-02 repeated-loss problem; if it does NOT, the '
                    'restriction\'s bear-market value comes from the few deep losses only.'),
    dict(name='A3_bands_a', family=FAMILY,
         description='Dollar-loss bands on |net P&L|: < $500 no restriction; $500-$5,000 arms with 3% '
                     'discount; > $5,000 arms with 5% discount. Reset as A0.',
         params=dict(trigger='net loss and |net P&L| >= 500',
                     required_level='exit * (1 - 0.03) if |loss| <= 5000 else exit * (1 - 0.05)',
                     reset='close >= 0.95 * frozen ref high'),
         hypothesis='Graduated severity: small losses (the -$143 type) free, moderate losses get the '
                    'verified 3%, big losses demand 5%. Should keep most bear protection while '
                    'freeing noise episodes; the 5% band risks V-bottom misses exactly where '
                    'lower-price-reentry C (-5%) missed (2020-03, 2009 QQQ was fine for C).'),
    dict(name='A3_bands_b', family=FAMILY,
         description='Single dollar band: net loss < $1,000 in magnitude: no restriction; otherwise '
                     'arms with the fixed 3% discount. Reset as A0.',
         params=dict(trigger='net loss and |net P&L| >= 1000', discount=0.03,
                     reset='close >= 0.95 * frozen ref high'),
         hypothesis='The simplest materiality rule in dollars. A $1,000 floor on a $100k position is '
                    'roughly a -1% net return floor, so it should behave like A2_material_1 but also '
                    'exempt financing-heavy small losses; one parameter, easy to reason about.'),
    dict(name='A4_proportional_05', family=FAMILY,
         description='Severity-scaled: arms on any price loss; required decline = clip(0.5 * |price '
                     'return|, 1%, 8%) off the loss exit. Reset as A0.',
         params=dict(trigger='exit_price < entry_price',
                     required_level='exit * (1 - clip(0.5*|price_return|, 0.01, 0.08))',
                     reset='close >= 0.95 * frozen ref high'),
         hypothesis='Proportional severity: tiny price losses impose only a 1% hurdle (nearly free '
                    're-entry, so V-bottom recoveries after small losses survive), deep losses demand '
                    'more. With k=0.5 a -6% loss asks 3%: gentler than A0 almost everywhere; should '
                    'dominate binary triggers IF severity, not existence, of the loss is what matters.'),
    dict(name='A4_proportional_10', family=FAMILY,
         description='Severity-scaled: arms on any price loss; required decline = clip(1.0 * |price '
                     'return|, 1%, 8%) off the loss exit. Reset as A0.',
         params=dict(trigger='exit_price < entry_price',
                     required_level='exit * (1 - clip(1.0*|price_return|, 0.01, 0.08))',
                     reset='close >= 0.95 * frozen ref high'),
         hypothesis='k=1: the market must fall again by as much as it already cost us. In cascades this '
                    'ratchets toward the 8% cap and should approach lower-price-reentry D\'s behaviour '
                    '(strong 2000-02 protection, missed 2009/2026 rebounds); after small losses it '
                    'stays near 1% and keeps recoveries. Tests whether one adaptive rule can span the '
                    'B-vs-D regime split identified in the prior report.'),
]
