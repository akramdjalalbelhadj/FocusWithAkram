package com.focusflow.transfer.service;

import static org.assertj.core.api.Assertions.assertThat;


import org.junit.jupiter.api.Test;

class CsvEscapingTest {

    @Test
    void quotesFieldsContainingSeparatorsAndQuotes() {
        assertThat(TransferService.csv("a,b")).isEqualTo("\"a,b\"");
        assertThat(TransferService.csv("dit \"oui\"")).isEqualTo("\"dit \"\"oui\"\"\"");
        assertThat(TransferService.csv("ligne1\nligne2")).isEqualTo("\"ligne1\nligne2\"");
    }

    @Test
    void neutralisesSpreadsheetFormulas() {
        assertThat(TransferService.csv("=HYPERLINK(\"http://x\")")).startsWith("\"'=");
        assertThat(TransferService.csv("+33 6")).isEqualTo("'+33 6");
        assertThat(TransferService.csv("@cmd")).isEqualTo("'@cmd");
    }

    @Test
    void leavesNumbersAndNullsAlone() {
        assertThat(TransferService.csv(-5)).isEqualTo("-5");
        assertThat(TransferService.csv(null)).isEmpty();
        assertThat(TransferService.csv("Simple")).isEqualTo("Simple");
    }
}
