#!/bin/zsh

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 input_file.txt"
    exit 1
fi

total_lines=$(wc -l < "$1")
current_line=0

while IFS= read -r page; do
    ((current_line++))
    echo "Processing [$current_line/$total_lines]: $page"
    npx ts-node scripts/test-prompt.ts "$page"
    npx ts-node scripts/process-timeline-output.ts "prompt-tests/$page-gemini.json"
    echo "Completed [$current_line/$total_lines]: $page"
done < "$1"
