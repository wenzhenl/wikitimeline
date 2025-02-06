#!/bin/zsh

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 input_file.txt"
    exit 1
fi

while IFS= read -r page; do
    echo "Processing $page..."
    npx ts-node scripts/test-prompt.ts "$page"
    sleep 1
    npx ts-node scripts/process-timeline-output.ts "prompt-tests/$page-gemini.json"
    echo "Waiting 10 seconds..."
    sleep 10
done < "$1"
