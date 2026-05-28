#include <iostream>
#include <fstream>
#include <string>
#include <vector>
using namespace std;

struct node{
    int data;
    node* next;
};
node* HEAD = NULL;
void insertAtHead(int val){
    node * newNode = new node;
    newNode->data = val;
    newNode->next = HEAD;
    HEAD = newNode;
}
void createList(){
    for(int i = 0; i < 100; i++){
        insertAtHead(i);
    }
}
void deleteList(){
    node * temp = HEAD;
    while(temp != NULL){
        node * toDelete = temp;
        temp = temp->next;
        delete toDelete;
    }
    HEAD = NULL;
}
void display(){
    node * temp = HEAD;
    while(temp != NULL){
        cout << temp->data << ", "; 
        temp = temp->next;
    }
    cout << "\n endl";
}
void changeFile(){
    fstream facultyData("4137956.csv", ios::trunc | ios::out );
    node * temp = HEAD;
    while(temp->next != NULL){
        facultyData << temp->data << "," << "An element" << endl;
        temp = temp->next;
    }
}

void readFile(){
    fstream fin;

    // Open an existing file
    fin.open("4137956.csv", ios::in);

    // Get the roll number
    // of which the data is required

    // Read the Data from the file
    // as String Vector
    vector<string> row;
    string line, word, temp;

    while (fin >> temp)
    {

        row.clear();

        // read an entire row and
        // store it in a string variable 'line'
        getline(fin, line);

        // used for breaking words
        stringstream s(line);

        // read every column data of a row and
        // store it in a string variable, 'word'
        while (getline(s, word, ','))
        {
            // add all the column data
            // of a row to a vector
            row.push_back(word);
        }
    }
    if (count == 0)
        cout << "Record not found\n";
    fin.close();
}

int main(){
    createList();
    changeFile();
    display();
    deleteList();
    display();
    cout << "~~~~~~~~~~~~~~~~~~~~~~~~~~~lOCAL STORAGE~~~~~~~~~~~~~~~~~~~~~~~~~~" << endl;
    readFile();
    return 0;
}