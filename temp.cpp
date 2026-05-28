#include <iostream>
#include <fstream>
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
    
}
void createList(){
    for(int i = 0; i < 100; i++){

    }
}

void insertNode(int data){

}
void changeFile(){
    fstream facultyData("4137956.csv", ios::trunc | ios::out);

}