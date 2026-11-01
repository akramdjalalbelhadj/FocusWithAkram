package com.focusflow.finance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.focusflow.common.exception.ApiException;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class MoneyTest {

    @Test
    void amountsAreNormalisedToCents() {
        assertThat(Money.positive(new BigDecimal("12.5"), "m")).isEqualByComparingTo("12.50").hasScaleOf(2);
        assertThat(Money.positive(new BigDecimal("7"), "m")).hasScaleOf(2);
        assertThat(Money.cents(new BigDecimal("-3.10"), "m")).isEqualByComparingTo("-3.10");
    }

    @Test
    void subCentPrecisionIsRejectedRatherThanRounded() {
        assertThatThrownBy(() -> Money.positive(new BigDecimal("0.005"), "m")).isInstanceOf(ApiException.class);
        // Des zeros de fin ne sont pas une precision supplementaire.
        assertThat(Money.positive(new BigDecimal("1.2300"), "m")).isEqualByComparingTo("1.23");
    }

    @Test
    void zeroNegativeAndOutOfRangeAmountsAreRejected() {
        assertThatThrownBy(() -> Money.positive(BigDecimal.ZERO, "m")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> Money.positive(new BigDecimal("-1"), "m")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> Money.positive(null, "m")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> Money.cents(new BigDecimal("10000000000.00"), "m")).isInstanceOf(ApiException.class);
        assertThat(Money.cents(Money.MAX, "m")).isEqualByComparingTo(Money.MAX);
    }
}
